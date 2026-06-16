import { Global, Module } from '@nestjs/common';
import { CreatorProfileWhatsAppNotifier } from './creator-profile-whatsapp.notifier';
import { MetaWhatsAppConnector } from './meta-whatsApp.connector';
import { OrderWhatsAppNotifier } from './order-whatsapp.notifier';
import { WhatsAppService } from './whatsapp.service';

@Global()
@Module({
  providers: [
    MetaWhatsAppConnector,
    WhatsAppService,
    OrderWhatsAppNotifier,
    CreatorProfileWhatsAppNotifier,
  ],
  exports: [
    WhatsAppService,
    OrderWhatsAppNotifier,
    CreatorProfileWhatsAppNotifier,
  ],
})
export class WhatsAppModule {}
