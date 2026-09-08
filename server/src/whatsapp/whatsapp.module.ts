import { Global, Module } from '@nestjs/common';
import { WhatsAppCloudTransport } from './whatsapp-cloud.transport';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

/**
 * WhatsApp notifications, structured to mirror MailModule: a Cloud API transport
 * plus the orchestrator service, exported globally. The per-event WhatsApp sends
 * are fired from the existing mail notifiers (they already resolve recipient,
 * name and deep-link), so a single WhatsAppService is all this module exposes.
 *
 * The webhook controller receives Meta's delivery-status callbacks so we log the
 * real sent/delivered/read/failed outcome, not just the queued `accepted` reply.
 */
@Global()
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppCloudTransport, WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
