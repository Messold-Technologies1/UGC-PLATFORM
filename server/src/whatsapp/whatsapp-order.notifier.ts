import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppTemplateKey } from './whatsapp.types';
import {
  frontendBaseUrl,
  frontendRelativePath,
} from '../util/frontend-url.util';

/**
 * Order-related WhatsApp notifications — the WhatsApp twin of the order mail
 * notifier. Fire-and-forget: a WhatsApp failure never blocks the order flow.
 *
 * This wires ONE event end-to-end (brief submitted -> creator) as the reference
 * implementation; add sibling methods for other events the same way, calling
 * them next to the existing `orderMail.notify*` calls in OrdersService.
 */
@Injectable()
export class WhatsAppOrderNotifier {
  private readonly logger = new Logger(WhatsAppOrderNotifier.name);

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Brand submitted a brief -> notify the creator on WhatsApp. */
  notifyBriefSubmitted(orderId: string): void {
    void this.run('brief_submitted', async () => {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          brand: { select: { brandName: true } },
          creator: {
            select: {
              id: true,
              displayName: true,
              whatsappNotificationsEnabled: true,
              user: { select: { name: true, phone: true } },
            },
          },
        },
      });
      if (!order) return;

      const creatorName =
        order.creator.displayName?.trim() ||
        order.creator.user?.name?.trim() ||
        'there';
      const brandName = order.brand.brandName?.trim() || 'A brand';

      // Same deep link the email uses; passed as a frontend relative path so a
      // single approved template (button base `${FRONTEND_URL}/{{1}}`) can point
      // anywhere. See frontend-url.util.
      const base = frontendBaseUrl(this.config);
      const actionUrl = `${base}/creator/orders/${order.id}/brief`;

      await this.whatsapp.send({
        to: order.creator.user?.phone,
        template: WhatsAppTemplateKey.ORDER_BRIEF_SUBMITTED_FOR_CREATOR,
        bodyVars: [creatorName, brandName],
        buttonUrlVar: frontendRelativePath(base, actionUrl),
        notificationGate: { profileType: 'creator', profileId: order.creator.id },
      });
    });
  }

  private async run(label: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(
        `order whatsapp ${label} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
