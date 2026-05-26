import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSuppressionService } from './email-suppression.service';
import { SesMailTransport } from './ses-mail.transport';
import { TemplateRendererService } from './template-renderer.service';
import type { SendMailParams } from './mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly renderer: TemplateRendererService,
    private readonly transport: SesMailTransport,
    private readonly suppression: EmailSuppressionService,
  ) {}

  /** Returns true when outbound email is configured and enabled. */
  isEnabled(): boolean {
    if (this.config.get<string>('MAIL_ENABLED') === 'false') return false;
    return Boolean(this.config.get<string>('SES_FROM_EMAIL')?.trim());
  }

  async send(params: SendMailParams): Promise<void> {
    const to = params.to?.trim();
    if (!to) {
      this.logger.warn(
        `skip email template=${params.templateKey}: empty recipient`,
      );
      return;
    }

    if (!this.isEnabled()) {
      this.logger.debug(
        `skip email template=${params.templateKey} to=${to} (mail disabled or SES_FROM_EMAIL unset)`,
      );
      return;
    }

    if (await this.suppression.isSuppressed(to)) {
      this.logger.warn(
        `skip email template=${params.templateKey} to=${to} (address suppressed)`,
      );
      return;
    }

    const rendered = this.renderer.render(params.templateKey, params.context);
    await this.transport.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }
}
