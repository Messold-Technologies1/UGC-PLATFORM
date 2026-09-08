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

  /**
   * Best-effort in-memory map of `wamid` -> what we sent, so the status webhook
   * can name the template/recipient when Meta reports delivery. Bounded and
   * lossy by design (a restart or a second replica simply logs `template=?`);
   * the delivery status is still logged either way.
   */
  private readonly outbound = new Map<
    string,
    { template: string; to: string; at: number }
  >();
  private static readonly OUTBOUND_MAX = 5_000;

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

    this.logger.log(`sending whatsapp template=${params.template} to=${to}`);
    try {
      const messageId = await withTimeout(
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
      if (messageId && messageId !== 'unknown') {
        this.rememberOutbound(messageId, params.template, to);
      }
    } catch (err) {
      if (err instanceof TimeoutError) {
        this.logger.warn(
          `whatsapp timeout template=${params.template} to=${to}: ${err.message}`,
        );
      }
      throw err;
    }
  }

  // ---- Delivery status webhook ----

  /**
   * Verify Meta's webhook subscription handshake. Meta calls
   * `GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
   * once when you add the callback URL; echo `hub.challenge` back only when the
   * token matches `WHATSAPP_WEBHOOK_VERIFY_TOKEN`. Returns the challenge string
   * to reply with, or null to reject (403).
   */
  verifyWebhookChallenge(
    mode: string | undefined,
    token: string | undefined,
    challenge: string | undefined,
  ): string | null {
    const expected = this.config
      .get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN')
      ?.trim();
    if (!expected) {
      this.logger.warn(
        'whatsapp webhook verify: WHATSAPP_WEBHOOK_VERIFY_TOKEN not set; rejecting handshake',
      );
      return null;
    }
    if (mode === 'subscribe' && token === expected && challenge) {
      this.logger.log('whatsapp webhook verify: handshake accepted');
      return challenge;
    }
    this.logger.warn(
      `whatsapp webhook verify: handshake rejected (mode=${mode ?? '<none>'}, token match=${token === expected})`,
    );
    return null;
  }

  /**
   * Log a delivery-status callback from Meta. This is where a send is finally
   * reported as truly `sent` / `delivered` / `read`, or `failed` with the Meta
   * error code + reason — as opposed to the `accepted` (queued) line emitted at
   * POST time. The template/recipient are filled in from the outbound map when
   * known (best-effort).
   */
  noteStatusUpdate(update: {
    messageId: string;
    recipient?: string;
    status: string;
    timestamp?: string;
    errors?: Array<{
      code?: number;
      title?: string;
      message?: string;
      error_data?: { details?: string };
    }>;
  }): void {
    const known = this.outbound.get(update.messageId);
    const template = known?.template ?? 'unknown';
    const to = update.recipient || known?.to || 'unknown';
    const base = `whatsapp delivery template=${template} to=${to} messageId=${update.messageId} status=${update.status}`;

    if (update.status === 'failed') {
      const err = update.errors?.[0];
      const detail =
        err?.error_data?.details || err?.message || err?.title || 'no detail';
      this.logger.warn(
        `${base} error_code=${err?.code ?? '?'} error="${detail}"`,
      );
      return;
    }

    this.logger.log(base);
    // A terminal state means we no longer need to remember this id.
    if (update.status === 'delivered' || update.status === 'read') {
      this.outbound.delete(update.messageId);
    }
  }

  /** Record an accepted send so the status webhook can name it later. */
  private rememberOutbound(
    messageId: string,
    template: string,
    to: string,
  ): void {
    if (this.outbound.size >= WhatsAppService.OUTBOUND_MAX) {
      // Evict the oldest ~10% (Map preserves insertion order) to stay bounded.
      const drop = Math.ceil(WhatsAppService.OUTBOUND_MAX * 0.1);
      let removed = 0;
      for (const key of this.outbound.keys()) {
        this.outbound.delete(key);
        if (++removed >= drop) break;
      }
    }
    this.outbound.set(messageId, { template, to, at: Date.now() });
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
