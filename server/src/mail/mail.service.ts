import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailSuppressionService } from './email-suppression.service';
import { SesMailTransport } from './ses-mail.transport';
import { TemplateRendererService } from './template-renderer.service';
import {
  EmailTemplateKey,
  type MailNotificationGate,
  type SendMailParams,
} from './mail.types';
import { TimeoutError, withTimeout } from '../util/with-timeout';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly sendTimeoutMs: number;

  constructor(
    private readonly config: ConfigService,
    private readonly renderer: TemplateRendererService,
    private readonly transport: SesMailTransport,
    private readonly suppression: EmailSuppressionService,
    private readonly prisma: PrismaService,
  ) {
    this.sendTimeoutMs = this.config.get<number>('MAIL_SEND_TIMEOUT_MS', 10_000);
  }

  onModuleInit(): void {
    const from = this.config.get<string>('SES_FROM_EMAIL')?.trim();
    const sesKey = this.config.get<string>('AWS_SES_ACCESS_KEY_ID')?.trim();
    const sesSecret = this.config.get<string>('AWS_SES_SECRET_ACCESS_KEY')?.trim();
    const mailEnabledFlag = this.config.get<string>('MAIL_ENABLED');
    const enabled = this.isEnabled();

    this.logger.log(
      `mail outbound ${enabled ? 'enabled' : 'disabled'} ` +
        `(MAIL_ENABLED=${mailEnabledFlag ?? '<unset>'}, ` +
        `SES_FROM_EMAIL=${from ? 'set' : 'missing'}, ` +
        `AWS_SES_ACCESS_KEY_ID=${sesKey ? 'set' : 'missing'}, ` +
        `AWS_SES_SECRET_ACCESS_KEY=${sesSecret ? 'set' : 'missing'})`,
    );
  }

  /** Returns true when outbound email is configured and enabled. */
  isEnabled(): boolean {
    if (this.config.get<string>('MAIL_ENABLED') === 'false') return false;
    const from = this.config.get<string>('SES_FROM_EMAIL')?.trim();
    const sesKey = this.config.get<string>('AWS_SES_ACCESS_KEY_ID')?.trim();
    const sesSecret = this.config.get<string>('AWS_SES_SECRET_ACCESS_KEY')?.trim();
    return Boolean(from && sesKey && sesSecret);
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
      this.logger.warn(
        `skip email template=${params.templateKey} to=${to} (mail disabled or SES env not configured)`,
      );
      return;
    }

    if (!(await this.canSendToProfile(params))) {
      this.logger.warn(
        `skip email template=${params.templateKey} to=${to} (email notifications disabled or missing notificationGate)`,
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
    this.logger.log(
      `sending email template=${params.templateKey} to=${to} subject="${rendered.subject}"`,
    );
    try {
      await withTimeout(
        this.transport.send({
          to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
        this.sendTimeoutMs,
        `SES send template=${params.templateKey}`,
      );
    } catch (err) {
      if (err instanceof TimeoutError) {
        this.logger.warn(
          `email timeout template=${params.templateKey} to=${to}: ${err.message}`,
        );
      }
      throw err;
    }
  }

  private isTransactionalTemplate(templateKey: EmailTemplateKey): boolean {
    return templateKey === EmailTemplateKey.PASSWORD_RESET;
  }

  private async canSendToProfile(params: SendMailParams): Promise<boolean> {
    if (this.isTransactionalTemplate(params.templateKey)) {
      return true;
    }

    const gate = params.notificationGate;
    if (!gate) {
      this.logger.warn(
        `skip email template=${params.templateKey} to=${params.to}: missing notificationGate`,
      );
      return false;
    }

    return this.isEmailNotificationsEnabled(gate);
  }

  private async isEmailNotificationsEnabled(
    gate: MailNotificationGate,
  ): Promise<boolean> {
    if (gate.profileType === 'creator') {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { id: gate.profileId },
        select: { emailNotificationsEnabled: true },
      });
      return profile?.emailNotificationsEnabled ?? false;
    }

    const profile = await this.prisma.brandProfile.findUnique({
      where: { id: gate.profileId },
      select: { emailNotificationsEnabled: true },
    });
    return profile?.emailNotificationsEnabled ?? false;
  }
}
