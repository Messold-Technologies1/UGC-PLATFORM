import { Global, Module } from '@nestjs/common';
import { WhatsAppCloudTransport } from './whatsapp-cloud.transport';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppOrderNotifier } from './whatsapp-order.notifier';

/**
 * WhatsApp notifications, structured to mirror MailModule: a transport + an
 * orchestrator service + per-domain notifiers, exported globally so domain
 * services can inject a notifier the same way they inject the mail notifiers.
 */
@Global()
@Module({
  providers: [WhatsAppCloudTransport, WhatsAppService, WhatsAppOrderNotifier],
  exports: [WhatsAppService, WhatsAppOrderNotifier],
})
export class WhatsAppModule {}
