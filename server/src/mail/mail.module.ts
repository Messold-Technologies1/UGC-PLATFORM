import { Global, Module } from '@nestjs/common';
import { CreatorProfileMailNotifier } from './creator-profile-mail.notifier';
import { EmailSuppressionService } from './email-suppression.service';
import { MailService } from './mail.service';
import { OrderMailNotifier } from './order-mail.notifier';
import { SesMailTransport } from './ses-mail.transport';
import { TemplateRendererService } from './template-renderer.service';

@Global()
@Module({
  providers: [
    TemplateRendererService,
    SesMailTransport,
    MailService,
    EmailSuppressionService,
    OrderMailNotifier,
    CreatorProfileMailNotifier,
  ],
  exports: [
    MailService,
    EmailSuppressionService,
    TemplateRendererService,
    OrderMailNotifier,
    CreatorProfileMailNotifier,
  ],
})
export class MailModule {}
