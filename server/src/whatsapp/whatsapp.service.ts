import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudTransport } from './whatsapp-cloud.transport';
import type {
  SendWhatsAppParams,
  WhatsAppNotificationGate,
} from './whatsapp.types';
import { TimeoutError, withTimeout } from '../util/with-timeout';

/**
 * WhatsApp notification orchestrator — the WhatsApp twin of `MailService`.
 *
 * Same skeleton: `isEnabled()` gate, empty-recipient skip, opt-in gate
 * (`whatsappNotificationsEnabled`), timeout-wrapped transport call, and
 * skip/send logging. Disabled and safe by default: with the WHATSAPP_* env
 * unset it no-ops with a log, exactly like MailService without SES configured.
 */
@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly sendTimeoutMs: number;
  private readonly defaultLanguage: string;

  constructor(
    private readonly config: ConfigService,
    private readonly transport: WhatsAppCloudTransport,
    private readonly prisma: PrismaService,
  ) {
    this.sendTimeoutMs = this.config.get<number>(
      'WHATSAPP_SEND_TIMEOUT_MS',
      10_000,
    );
    this.defaultLanguage =
      this.config.get<string>('WHATSAPP_DEFAULT_LANGUAGE')?.trim() || 'en';
  }

  onModuleInit(): void {
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim();
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim();
    const flag = this.config.get<string>('WHATSAPP_ENABLED');
    this.logger.log(
      `whatsapp outbound ${this.isEnabled() ? 'enabled' : 'disabled'} ` +
        `(WHATSAPP_ENABLED=${flag ?? '<unset>'}, ` +
        `WHATSAPP_PHONE_NUMBER_ID=${phoneId ? 'set' : 'missing'}, ` +
        `WHATSAPP_ACCESS_TOKEN=${token ? 'set' : 'missing'})`,
    );
  }

  /** True when outbound WhatsApp is configured and not explicitly disabled. */
  isEnabled(): boolean {
    if (this.config.get<string>('WHATSAPP_ENABLED') === 'false') return false;
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim();
    const token = this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim();
    return Boolean(phoneId && token);
  }

  async send(params: SendWhatsAppParams): Promise<void> {
    const to = this.normalizePhone(params.to);
    if (!to) {
      this.logger.warn(
        `skip whatsapp template=${params.template}: empty/invalid recipient`,
      );
      return;
    }

    if (!this.isEnabled()) {
      this.logger.warn(
        `skip whatsapp template=${params.template} to=${to} (whatsapp disabled or env not configured)`,
      );
      return;
    }

    if (!(await this.canSendToProfile(params.notificationGate))) {
      this.logger.warn(
        `skip whatsapp template=${params.template} to=${to} (notifications disabled or missing gate)`,
      );
      return;
    }

    this.logger.log(
      `sending whatsapp template=${params.template} to=${to}`,
    );
    try {
      await withTimeout(
        this.transport.send({
          to,
          templateName: params.template,
          language: this.defaultLanguage,
          bodyVars: params.bodyVars ?? [],
          buttonUrlVar: params.buttonUrlVar,
        }),
        this.sendTimeoutMs,
        `WhatsApp send template=${params.template}`,
      );
    } catch (err) {
      if (err instanceof TimeoutError) {
        this.logger.warn(
          `whatsapp timeout template=${params.template} to=${to}: ${err.message}`,
        );
      }
      throw err;
    }
  }

  /**
   * Normalize to E.164 digits with no `+`, as the Cloud API expects
   * (e.g. `+91 98123-45678` -> `919812345678`). Returns null if nothing usable.
   */
  private normalizePhone(raw: string | null | undefined): string | null {
    const digits = (raw ?? '').replace(/\D/g, '');
    // Guard against obviously-not-a-phone values (needs a country code + number).
    return digits.length >= 8 ? digits : null;
  }

  private async canSendToProfile(
    gate: WhatsAppNotificationGate | undefined,
  ): Promise<boolean> {
    if (!gate) return false;
    if (gate.profileType === 'creator') {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { id: gate.profileId },
        select: { whatsappNotificationsEnabled: true },
      });
      return profile?.whatsappNotificationsEnabled ?? false;
    }
    const profile = await this.prisma.brandProfile.findUnique({
      where: { id: gate.profileId },
      select: { whatsappNotificationsEnabled: true },
    });
    return profile?.whatsappNotificationsEnabled ?? false;
  }
}
