import { Global, Module } from '@nestjs/common';
import { WhatsAppCloudTransport } from './whatsapp-cloud.transport';
import { WhatsAppService } from './whatsapp.service';

/**
 * WhatsApp notifications, structured to mirror MailModule: a Cloud API transport
 * plus the orchestrator service, exported globally. The per-event WhatsApp sends
 * are fired from the existing mail notifiers (they already resolve recipient,
 * name and deep-link), so a single WhatsAppService is all this module exposes.
 */
@Global()
@Module({
  providers: [WhatsAppCloudTransport, WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
