import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { supportsDelay } from './define-events';
import {
  NOTIFICATION_EVENTS_BY_KEY,
  NOTIFICATION_EVENT_KEYS,
  defaultWhatsAppTemplateName,
} from './event-catalog';

/**
 * Mirrors the code catalog into `NotificationEvent` on boot, so the admin list
 * is always current without the admin API needing access to the catalog module.
 *
 * The split of ownership is the whole point:
 *
 * - **Code-owned**, rewritten on every sync: label, description, recipient,
 *   vars, alwaysSend, supportsDelay. An admin cannot, for example, mark an
 *   event `alwaysSend` and have it bypass everyone's opt-out.
 * - **Admin-owned**, never touched after the row first appears: isActive,
 *   emailTemplateId, whatsappTemplateName, and the schedule rows.
 *
 * A key that disappears from the catalog is flagged `deprecated` rather than
 * deleted, because schedule rows and log entries still reference it.
 *
 * Called by {@link NotificationBootstrapService} rather than from its own
 * `onModuleInit`, because the template import has to run strictly after it —
 * templates link to events by key, so the rows must exist first. One ordered
 * boot sequence says that explicitly instead of leaning on provider order.
 */
@Injectable()
export class NotificationRegistrySyncService {
  private readonly logger = new Logger(NotificationRegistrySyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sync(): Promise<{ upserted: number; deprecated: number }> {
    let upserted = 0;

    for (const key of NOTIFICATION_EVENT_KEYS) {
      const def = NOTIFICATION_EVENTS_BY_KEY[key];
      const codeOwned = {
        label: def.label,
        description: def.description ?? null,
        recipient: def.recipient,
        vars: def.vars as object,
        alwaysSend: def.alwaysSend ?? false,
        supportsDelay: supportsDelay(def),
        deprecated: false,
      };

      await this.prisma.notificationEvent.upsert({
        where: { key },
        // Admin-owned columns are absent here on purpose: an existing row keeps
        // its isActive, template choices and schedule across every deploy.
        update: codeOwned,
        create: {
          key,
          ...codeOwned,
          // Defaults only, applied the first time the event appears. The
          // template link is left null until the seeder or an admin sets it;
          // the renderer falls back to the same-named template meanwhile.
          whatsappTemplateName: defaultWhatsAppTemplateName(key),
        },
      });
      upserted += 1;
    }

    // Anything still in the table that the catalog no longer declares.
    const { count: deprecated } =
      await this.prisma.notificationEvent.updateMany({
        where: {
          key: { notIn: [...NOTIFICATION_EVENT_KEYS] },
          deprecated: false,
        },
        data: { deprecated: true },
      });

    this.logger.log(
      `notification catalog synced: ${upserted} event(s)` +
        (deprecated > 0 ? `, ${deprecated} deprecated` : ''),
    );
    return { upserted, deprecated };
  }
}
