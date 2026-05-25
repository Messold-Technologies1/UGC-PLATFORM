import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { SesMailTransport } from './ses-mail.transport';
import { TemplateRendererService } from './template-renderer.service';

@Global()
@Module({
  providers: [TemplateRendererService, SesMailTransport, MailService],
  exports: [MailService, TemplateRendererService],
})
export class MailModule {}
