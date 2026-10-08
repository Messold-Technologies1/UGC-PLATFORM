import { Global, Module } from '@nestjs/common';
import { EmailSuppressionService } from './email-suppression.service';
import { MailService } from './mail.service';
import { SesMailTransport } from './ses-mail.transport';
import { TemplateRendererService } from './template-renderer.service';

@Global()
@Module({
  providers: [
    TemplateRendererService,
    SesMailTransport,
    MailService,
    EmailSuppressionService,
  ],
  exports: [
    MailService,
    // Exported so the notifications module can drive the provider directly:
    // it runs its own gate chain and renders from the database.
    SesMailTransport,
    EmailSuppressionService,
    TemplateRendererService,
  ],
})
export class MailModule {}
