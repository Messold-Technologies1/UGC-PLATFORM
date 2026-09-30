import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  createHash,
  createHmac,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudTransport } from '../whatsapp/whatsapp-cloud.transport';

/**
 * Outcome of checking a submitted code. These strings are the same set Twilio
 * Verify returned, kept deliberately: `AuthService`, `SignupRegistrationService`
 * and `AuthPhoneController` all branch on them, and the client maps them to
 * user-facing copy. Swapping the provider underneath should not ripple outward.
 */
export type PhoneOtpCheckStatus =
  | 'approved'
  | 'pending'
  | 'expired'
  | 'max_attempts_reached';

/** Which flow a code was issued for. Codes do not cross purposes. */
export type PhoneOtpPurpose = 'signup' | 'profile';

/**
 * What we know about the delivery of the most recent code for a phone. Meta's
 * send call only ever reports `accepted` (queued); the real outcome lands on the
 * status webhook seconds later, which is why this is a separate lookup rather
 * than part of the send response.
 */
export type PhoneOtpDeliveryState = {
  status: 'unknown' | 'pending' | 'delivered' | 'failed';
  /** True for Meta error 131026 — the number is not reachable on WhatsApp. */
  notOnWhatsApp: boolean;
};

/**
 * Fixed code accepted by the non-production dev bypass (see below). Never
 * active in production or when WhatsApp is configured.
 */
const DEV_BYPASS_OTP_CODE = '000000';

/** How long a code stays valid. */
const OTP_TTL_MS = 10 * 60_000;
/** Minimum gap between two sends to the same number. */
const RESEND_COOLDOWN_MS = 60_000;
/** Wrong guesses allowed against one code before it is burned. */
const MAX_VERIFY_ATTEMPTS = 5;
/** Codes per number per rolling hour, and per rolling day. */
const MAX_SENDS_PER_HOUR = 5;
const MAX_SENDS_PER_DAY = 10;
/** Sends allowed from one IP per rolling hour, across all numbers. */
const MAX_SENDS_PER_IP_PER_HOUR = 20;
/** Meta error code meaning the recipient is not reachable on WhatsApp. */
const META_ERROR_UNDELIVERABLE = 131026;
/**
 * How far back a delivery-status lookup may see. The signup variant is
 * unauthenticated, so without a bound it would answer "has anyone ever started
 * signup with this number?" for any number. Restricting it to a live send
 * window keeps it useful to the person who just requested a code and useless as
 * a general oracle.
 */
const DELIVERY_LOOKUP_WINDOW_MS = 15 * 60_000;
/** Rows are kept this long for support/abuse forensics, then purged. */
const RETENTION_DAYS = 30;

/**
 * Raised when a caller is sending too fast. Controllers translate this into a
 * 429 — it is a rate limit, not a failure of the phone number.
 */
export class PhoneOtpRateLimitError extends Error {
  constructor(
    message: string,
    /** Seconds until the caller may retry, when known. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'PhoneOtpRateLimitError';
  }
}

/**
 * Raised when Meta rejects the send outright (HTTP 4xx), rather than queueing
 * it. Controllers surface the message so the user can correct the number.
 */
export class PhoneOtpSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhoneOtpSendError';
  }
}

/**
 * Phone verification over WhatsApp, replacing Twilio Verify.
 *
 * The state Twilio used to hold for us now lives in the `PhoneOtp` table: the
 * code (hashed), its expiry, attempts, per-number send counters, and the
 * delivery outcome reported by Meta's status webhook.
 *
 * The send goes straight to {@link WhatsAppCloudTransport}, NOT through
 * `WhatsAppService`. That orchestrator gates every message on a creator/brand
 * profile having opted into WhatsApp notifications — at signup no profile
 * exists yet, so the OTP would be silently dropped; and an OTP is transactional,
 * so a marketing opt-out must never suppress it.
 */
@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppCloudTransport,
  ) {}

  private isConfigured(): boolean {
    if (this.config.get<string>('WHATSAPP_ENABLED') === 'false') return false;
    return Boolean(
      this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim() &&
      this.config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim(),
    );
  }

  /**
   * Dev/local convenience: when WhatsApp is NOT configured AND we are not in
   * production, phone verification is stubbed so the signup flow is testable
   * without sending messages — `sendVerificationCode` is a no-op and
   * `verifyCode` approves the fixed {@link DEV_BYPASS_OTP_CODE}. In production
   * the service always requires real WhatsApp (unconfigured → 503), so this can
   * never weaken prod.
   */
  private devBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' &&
      !this.isConfigured()
    );
  }

  /**
   * Key the code hash with a server secret so a leaked database cannot be
   * brute-forced: a 6-digit code has only a million candidates, which an
   * unkeyed SHA-256 would resolve instantly.
   */
  private hashCode(code: string): string {
    const secret =
      this.config.get<string>('PHONE_OTP_SECRET')?.trim() ||
      this.config.get<string>('JWT_ACCESS_SECRET') ||
      '';
    return createHmac('sha256', secret).update(code).digest('hex');
  }

  private hashIp(ip: string | undefined): string | null {
    const trimmed = ip?.trim();
    if (!trimmed) return null;
    return createHash('sha256').update(trimmed).digest('hex');
  }

  /** E.164 with a leading `+`, which is how phones are stored on `User`. */
  private normalizePhone(raw: string): string {
    const digits = (raw ?? '').replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  private generateCode(): string {
    // randomInt is CSPRNG-backed; Math.random would be guessable.
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private codeMatches(code: string, expectedHash: string): boolean {
    const actual = Buffer.from(this.hashCode(code), 'hex');
    const expected = Buffer.from(expectedHash, 'hex');
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  }

  /**
   * Issue a code and send it over WhatsApp.
   *
   * Rate limits are enforced here rather than by the controller's `@Throttle`,
   * which is per-IP, in-memory and therefore per-replica — it resets on every
   * deploy and does nothing about one attacker cycling IPs against one number.
   * Each send costs real money, and `/auth/signup/phone/send-otp` is public.
   */
  async sendVerificationCode(
    phone: string,
    purpose: PhoneOtpPurpose = 'profile',
    ip?: string,
  ): Promise<void> {
    const normalized = this.normalizePhone(phone);
    if (!normalized) {
      throw new PhoneOtpSendError('Enter a valid mobile number.');
    }

    if (this.devBypassEnabled()) {
      this.logger.warn(
        `[phone] DEV bypass active (WhatsApp unconfigured, non-prod) — pretending to send OTP to ${normalized}. Use code ${DEV_BYPASS_OTP_CODE}.`,
      );
      return;
    }
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Phone verification is not configured.',
      );
    }

    const now = new Date();
    const ipHash = this.hashIp(ip);
    await this.assertWithinSendLimits(normalized, purpose, now, ipHash);

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
    const sendsToday = await this.prisma.phoneOtp.count({
      where: { phone: normalized, purpose, createdAt: { gte: dayAgo } },
    });

    const code = this.generateCode();
    const record = await this.prisma.phoneOtp.create({
      data: {
        phone: normalized,
        codeHash: this.hashCode(code),
        purpose,
        sendCount: sendsToday + 1,
        lastSentAt: now,
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
        ipHash,
      },
      select: { id: true },
    });

    // Supersede any earlier live code for this number so only the newest works.
    await this.prisma.phoneOtp.updateMany({
      where: {
        phone: normalized,
        purpose,
        consumedAt: null,
        id: { not: record.id },
      },
      data: { consumedAt: now },
    });

    const templateName =
      this.config.get<string>('WHATSAPP_OTP_TEMPLATE_NAME')?.trim() ||
      'otp_verification';
    const language =
      this.config.get<string>('WHATSAPP_OTP_TEMPLATE_LANGUAGE')?.trim() ||
      this.config.get<string>('WHATSAPP_DEFAULT_LANGUAGE')?.trim() ||
      'en';

    try {
      const wamid = await this.whatsapp.sendAuthenticationCode({
        // The Cloud API wants E.164 digits with no `+`.
        to: normalized.replace(/\D/g, ''),
        templateName,
        language,
        code,
      });
      await this.prisma.phoneOtp.update({
        where: { id: record.id },
        data: { wamid, deliveryStatus: 'accepted' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Burn the code: it never reached anyone, and leaving it live would let
      // a failed send still count against the number's active-code slot.
      await this.prisma.phoneOtp.update({
        where: { id: record.id },
        data: {
          consumedAt: now,
          deliveryStatus: 'failed',
          failureDetail: message.slice(0, 500),
          failedAt: now,
        },
      });
      this.logger.error(
        `[phone] WhatsApp OTP send failed for ${normalized}: ${message}`,
      );
      throw new PhoneOtpSendError(
        'Could not send the code on WhatsApp. Check the number and try again.',
      );
    }
  }

  private async assertWithinSendLimits(
    phone: string,
    purpose: PhoneOtpPurpose,
    now: Date,
    ipHash: string | null,
  ): Promise<void> {
    const latest = await this.prisma.phoneOtp.findFirst({
      where: { phone, purpose },
      orderBy: { createdAt: 'desc' },
      select: { lastSentAt: true },
    });
    if (latest) {
      const elapsed = now.getTime() - latest.lastSentAt.getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new PhoneOtpRateLimitError(
          `Please wait ${wait}s before requesting another code.`,
          wait,
        );
      }
    }

    const hourAgo = new Date(now.getTime() - 60 * 60_000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);

    const [lastHour, lastDay] = await Promise.all([
      this.prisma.phoneOtp.count({
        where: { phone, purpose, createdAt: { gte: hourAgo } },
      }),
      this.prisma.phoneOtp.count({
        where: { phone, purpose, createdAt: { gte: dayAgo } },
      }),
    ]);

    if (lastHour >= MAX_SENDS_PER_HOUR) {
      throw new PhoneOtpRateLimitError(
        'Too many codes requested for this number. Try again in an hour.',
      );
    }
    if (lastDay >= MAX_SENDS_PER_DAY) {
      throw new PhoneOtpRateLimitError(
        'Too many codes requested for this number today. Try again tomorrow.',
      );
    }

    if (ipHash) {
      const fromIp = await this.prisma.phoneOtp.count({
        where: { ipHash, createdAt: { gte: hourAgo } },
      });
      if (fromIp >= MAX_SENDS_PER_IP_PER_HOUR) {
        throw new PhoneOtpRateLimitError(
          'Too many verification requests. Try again later.',
        );
      }
    }
  }

  /**
   * Check a submitted code and, on success, consume it so it cannot be reused.
   *
   * Returns rather than throws, mirroring the shape callers already handle.
   */
  async verifyCode(
    phone: string,
    code: string,
    purpose: PhoneOtpPurpose = 'profile',
  ): Promise<PhoneOtpCheckStatus> {
    const submitted = code.trim();

    if (this.devBypassEnabled()) {
      return submitted === DEV_BYPASS_OTP_CODE ? 'approved' : 'pending';
    }

    const normalized = this.normalizePhone(phone);
    const record = await this.prisma.phoneOtp.findFirst({
      where: { phone: normalized, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    // No live code: either none was ever sent, or the last one was already used
    // or superseded. Both read as "expired" to the user — ask for a new one.
    if (!record) return 'expired';

    if (record.expiresAt.getTime() <= Date.now()) {
      await this.prisma.phoneOtp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      return 'expired';
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.prisma.phoneOtp.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      });
      return 'max_attempts_reached';
    }

    if (!this.codeMatches(submitted, record.codeHash)) {
      const updated = await this.prisma.phoneOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true },
      });
      if (updated.attempts >= MAX_VERIFY_ATTEMPTS) {
        await this.prisma.phoneOtp.update({
          where: { id: record.id },
          data: { consumedAt: new Date() },
        });
        return 'max_attempts_reached';
      }
      return 'pending';
    }

    await this.prisma.phoneOtp.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return 'approved';
  }

  /**
   * Delivery state of the newest code sent to a number.
   *
   * Exists because Meta's send call returns `accepted` (queued) even for a
   * number that has no WhatsApp account — the `failed` verdict with error
   * 131026 only arrives on the status webhook, after the send response has
   * already gone back to the browser. The UI polls this once the resend
   * countdown lapses so it can say "this number isn't on WhatsApp" instead of
   * leaving the user staring at an empty code box.
   */
  async getDeliveryState(
    phone: string,
    purpose: PhoneOtpPurpose = 'profile',
  ): Promise<PhoneOtpDeliveryState> {
    if (this.devBypassEnabled()) {
      return { status: 'delivered', notOnWhatsApp: false };
    }

    const normalized = this.normalizePhone(phone);
    const record = await this.prisma.phoneOtp.findFirst({
      where: {
        phone: normalized,
        purpose,
        createdAt: { gte: new Date(Date.now() - DELIVERY_LOOKUP_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
      select: { deliveryStatus: true, failureCode: true },
    });
    if (!record) return { status: 'unknown', notOnWhatsApp: false };

    if (record.deliveryStatus === 'failed') {
      return {
        status: 'failed',
        notOnWhatsApp: record.failureCode === META_ERROR_UNDELIVERABLE,
      };
    }
    if (
      record.deliveryStatus === 'delivered' ||
      record.deliveryStatus === 'read'
    ) {
      return { status: 'delivered', notOnWhatsApp: false };
    }
    return { status: 'pending', notOnWhatsApp: false };
  }

  /**
   * Drop OTP rows past their retention window.
   *
   * They are kept well beyond expiry on purpose — a support question ("did my
   * code go out?") or an abuse investigation is answered from these rows — but
   * they are not permanent. Runs daily; a delete of a few thousand rows against
   * the `createdAt` index is cheap. Safe to run on every replica — the delete is
   * idempotent. Relies on ScheduleModule.forRoot() being registered app-wide
   * (JobsModule) for @Cron discovery.
   */
  @Cron('15 3 * * *')
  async purgeExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000);
    try {
      const { count } = await this.prisma.phoneOtp.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });
      if (count > 0) {
        this.logger.log(`[phone] purged ${count} expired OTP record(s)`);
      }
    } catch (err) {
      this.logger.warn(
        `[phone] OTP purge failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
