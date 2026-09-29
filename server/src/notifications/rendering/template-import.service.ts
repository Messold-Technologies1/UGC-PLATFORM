import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveMailTemplatesDir } from '../../mail/templates-dir';
import { NOTIFICATION_EVENT_KEYS } from '../catalog/event-catalog';
import {
  STAGE_OFFSETS,
  offsetSuffix,
  readBundledTemplates,
} from './bundled-templates';

/**
 * Copies the bundled `.hbs` files into `NotificationTemplate` so the admin UI
 * has something to list, links each event to its template, and seeds one
 * schedule row per event.
 *
 * This runs on boot rather than living only in a seeder script. The seeder was
 * a manual step nobody ran, so every deployed environment showed an empty
 * template list while the renderer quietly fell back to disk — working, but
 * uneditable, which is the opposite of the point.
 *
 * What it will and will not overwrite:
 *
 * - **A template an admin has edited** (`updatedByUserId` set) is never
 *   touched. The bundled copy is a starting point, not an authority.
 * - **An untouched template** is refreshed from disk, so shipping a new `.hbs`
 *   updates the database on deploy.
 * - **Event links and schedule rows** are only ever created, never rewritten:
 *   once an admin points an event somewhere, it stays there.
 *
 * Both the API and the worker boot this module, so the whole import runs under
 * a transaction-scoped advisory lock. Whichever process gets there first does
 * the work; the other blocks briefly and then finds nothing left to do. Without
 * it the two race on the same unique keys and one loses with P2002.
 */
@Injectable()
export class NotificationTemplateImportService {
  private readonly logger = new Logger(NotificationTemplateImportService.name);

  /** Arbitrary but fixed: any other advisory lock must not reuse it. */
  private static readonly LOCK_KEY = 0x6e6f7469; // "noti"

  constructor(private readonly prisma: PrismaService) {}

  async run(): Promise<{
    templates: number;
    linked: number;
    schedules: number;
  }> {
    const dir = resolveMailTemplatesDir();
    const bundled = readBundledTemplates(dir);

    return this.prisma.$transaction(
      async (tx) => {
        // Held until this transaction ends, so a concurrent boot waits rather
        // than colliding. Released automatically — no unlock to leak.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${NotificationTemplateImportService.LOCK_KEY})`;

        const idsByName = new Map<string, string>();
        let written = 0;

        for (const t of bundled) {
          const existing = await tx.notificationTemplate.findUnique({
            where: { name: t.name },
            select: { id: true, updatedByUserId: true },
          });

          if (existing?.updatedByUserId) {
            idsByName.set(t.name, existing.id);
            continue;
          }

          const row = await tx.notificationTemplate.upsert({
            where: { name: t.name },
            update: {
              subjectHbs: t.subjectHbs,
              htmlHbs: t.htmlHbs,
              textHbs: t.textHbs,
              description: t.description,
            },
            create: { ...t },
            select: { id: true },
          });
          idsByName.set(t.name, row.id);
          written += 1;
        }

        let linked = 0;
        let schedules = 0;

        for (const key of NOTIFICATION_EVENT_KEYS) {
          const event = await tx.notificationEvent.findUnique({
            where: { key },
            select: { emailTemplateId: true },
          });
          // The registry sync runs first and creates these; a key missing here
          // means the catalog changed under us, so leave it for the next boot.
          if (!event) continue;

          const offsets = STAGE_OFFSETS[key] ?? [0];
          const isDrip = Boolean(STAGE_OFFSETS[key]);

          // The drips point their schedule rows at per-stage templates, so the
          // event-level template stays null for them.
          if (!isDrip && !event.emailTemplateId) {
            const templateId = idsByName.get(key);
            if (templateId) {
              await tx.notificationEvent.update({
                where: { key },
                data: { emailTemplateId: templateId },
              });
              linked += 1;
            }
          }

          for (const [i, offsetMinutes] of offsets.entries()) {
            const existing = await tx.notificationSchedule.findUnique({
              where: {
                eventKey_offsetMinutes: { eventKey: key, offsetMinutes },
              },
              select: { id: true },
            });
            if (existing) continue;

            await tx.notificationSchedule.create({
              data: {
                eventKey: key,
                offsetMinutes,
                // Both channels, reproducing today's behaviour exactly: every
                // email currently fires its WhatsApp twin via
                // whatsapp-bridge.util.
                channels: [
                  NotificationChannel.EMAIL,
                  NotificationChannel.WHATSAPP,
                ],
                templateOverrideId: isDrip
                  ? (idsByName.get(`${key}-${offsetSuffix(offsetMinutes)}`) ??
                    null)
                  : null,
                sortOrder: i,
              },
            });
            schedules += 1;
          }
        }

        this.logger.log(
          `notification templates imported from ${dir}: ` +
            `${written}/${bundled.length} template(s) written, ` +
            `${linked} event link(s), ${schedules} schedule row(s)`,
        );
        return { templates: written, linked, schedules };
      },
      // The import is ~100 upserts plus the event pass; the 5s interactive
      // default is not enough against a hosted database on a cold pool.
      { timeout: 120_000, maxWait: 30_000 },
    );
  }
}
