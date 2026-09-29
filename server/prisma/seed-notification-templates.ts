import { PrismaClient, NotificationChannel } from '@prisma/client';
import { join } from 'node:path';
import {
  STAGE_OFFSETS,
  offsetSuffix,
  readBundledTemplates,
} from '../src/notifications/rendering/bundled-templates';
import { NOTIFICATION_EVENT_KEYS } from '../src/notifications/catalog/event-catalog';

/**
 * Imports the bundled `.hbs` templates into `NotificationTemplate`, links each
 * event to its template, and seeds one schedule row per event.
 *
 * The app now does this on every boot (NotificationBootstrapService), so this
 * script is only for running the import by hand — against a database the app is
 * not pointed at, or to see the per-row output. It shares its logic with the
 * boot path via `bundled-templates`, so the two cannot drift.
 *
 * Idempotent, and it deliberately does NOT touch a template whose content an
 * admin has already changed — the seed is a starting point, not an authority.
 *
 *   npm run prisma:seed:notification-templates
 */

const prisma = new PrismaClient();
const TEMPLATES_DIR = join(__dirname, '..', 'src', 'mail', 'templates');

async function main(): Promise<void> {
  console.log(`Seeding notification templates from ${TEMPLATES_DIR}`);

  const bundled = readBundledTemplates(TEMPLATES_DIR);
  console.log(`  ${bundled.length} template(s) built from disk\n`);

  const idsByName = new Map<string, string>();

  for (const t of bundled) {
    const existing = await prisma.notificationTemplate.findUnique({
      where: { name: t.name },
      select: { id: true, updatedByUserId: true },
    });

    // An admin has edited this one; leave their copy alone.
    if (existing?.updatedByUserId) {
      console.log(`  = ${t.name} (admin-edited, left as is)`);
      idsByName.set(t.name, existing.id);
      continue;
    }

    const row = await prisma.notificationTemplate.upsert({
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
    console.log(`  ${existing ? '~' : '+'} ${t.name}`);
    idsByName.set(t.name, row.id);
  }

  console.log(`\nLinking events and seeding schedules`);
  for (const key of NOTIFICATION_EVENT_KEYS) {
    const event = await prisma.notificationEvent.findUnique({
      where: { key },
      select: { emailTemplateId: true },
    });
    if (!event) {
      console.log(
        `  ! ${key} not in NotificationEvent — run the app once to sync`,
      );
      continue;
    }

    const offsets = STAGE_OFFSETS[key] ?? [0];
    const isDrip = Boolean(STAGE_OFFSETS[key]);

    if (!isDrip && !event.emailTemplateId) {
      const templateId = idsByName.get(key);
      if (templateId) {
        await prisma.notificationEvent.update({
          where: { key },
          data: { emailTemplateId: templateId },
        });
      }
    }

    for (const [i, offsetMinutes] of offsets.entries()) {
      const existing = await prisma.notificationSchedule.findUnique({
        where: { eventKey_offsetMinutes: { eventKey: key, offsetMinutes } },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.notificationSchedule.create({
        data: {
          eventKey: key,
          offsetMinutes,
          channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
          templateOverrideId: isDrip
            ? (idsByName.get(`${key}-${offsetSuffix(offsetMinutes)}`) ?? null)
            : null,
          sortOrder: i,
        },
      });
    }
    console.log(`  ✓ ${key} (${offsets.length} row(s))`);
  }

  const [templates, schedules] = await Promise.all([
    prisma.notificationTemplate.count(),
    prisma.notificationSchedule.count(),
  ]);
  console.log(
    `\nDone: ${templates} template(s), ${schedules} schedule row(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
