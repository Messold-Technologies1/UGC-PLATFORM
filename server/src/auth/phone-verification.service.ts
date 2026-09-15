import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

export type TwilioVerifyCheckStatus =
  | 'approved'
  | 'pending'
  | 'canceled'
  | 'expired'
  | 'max_attempts_reached'
  | string;

/**
 * Fixed code accepted by the non-production dev bypass (see below). Never
 * active in production or when Twilio is configured.
 */
const DEV_BYPASS_OTP_CODE = '000000';

@Injectable()
export class PhoneVerificationService {
  private readonly logger = new Logger(PhoneVerificationService.name);

  constructor(private readonly config: ConfigService) {}

  private isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim() &&
        this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim() &&
        this.config.get<string>('TWILIO_VERIFY_SERVICE_SID')?.trim(),
    );
  }

  /**
   * Dev/local convenience: when Twilio is NOT configured AND we are not in
   * production, phone verification is stubbed so the signup flow is testable
   * without SMS — `sendVerificationCode` is a no-op and `verifyCode` approves
   * the fixed {@link DEV_BYPASS_OTP_CODE}. In production the service always
   * requires real Twilio (unconfigured → 503), so this can never weaken prod.
   */
  private devBypassEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') !== 'production' && !this.isConfigured()
    );
  }

  private getTwilioClient(): ReturnType<typeof twilio> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    if (!sid || !token) {
      throw new ServiceUnavailableException(
        'Phone verification is not configured.',
      );
    }
    return twilio(sid, token);
  }

  private getVerifyServiceSid(): string {
    const sid = this.config.get<string>('TWILIO_VERIFY_SERVICE_SID')?.trim();
    if (!sid) {
      throw new ServiceUnavailableException(
        'Phone verification is not configured.',
      );
    }
    return sid;
  }

  async sendVerificationCode(phone: string): Promise<void> {
    if (this.devBypassEnabled()) {
      this.logger.warn(
        `[phone] DEV bypass active (Twilio unconfigured, non-prod) — pretending to send OTP to ${phone}. Use code ${DEV_BYPASS_OTP_CODE}.`,
      );
      return;
    }
    const client = this.getTwilioClient();
    const serviceSid = this.getVerifyServiceSid();
    await client.verify.v2.services(serviceSid).verifications.create({
      to: phone,
      channel: 'sms',
    });
  }

  async verifyCode(
    phone: string,
    code: string,
  ): Promise<TwilioVerifyCheckStatus> {
    if (this.devBypassEnabled()) {
      return code.trim() === DEV_BYPASS_OTP_CODE ? 'approved' : 'pending';
    }
    const client = this.getTwilioClient();
    const serviceSid = this.getVerifyServiceSid();
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code: code.trim() });
    return (check.status ?? 'pending') as TwilioVerifyCheckStatus;
  }
}
