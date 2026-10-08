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
 *
 * The raw transport is exported too: phone-verification OTPs must bypass
 * WhatsAppService's notification opt-in gate (an OTP is transactional, and at
 * signup there is no profile to carry the opt-in yet).
 */
@Global()
@Module({
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppCloudTransport, WhatsAppService],
  // WhatsAppCloudTransport is exported for the notifications module, which
  // gates and renders itself and needs only the Cloud API client — and for
  // phone verification, whose OTPs must bypass WhatsAppService's notification
  // opt-in gate (an OTP is transactional, and at signup there is no profile to
  // carry the opt-in yet).
  exports: [WhatsAppService, WhatsAppCloudTransport],
})
export class WhatsAppModule {}
