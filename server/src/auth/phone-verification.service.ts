import {
  Injectable,
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

@Injectable()
export class PhoneVerificationService {
  constructor(private readonly config: ConfigService) {}

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
    const client = this.getTwilioClient();
    const serviceSid = this.getVerifyServiceSid();
    const check = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({ to: phone, code: code.trim() });
    return (check.status ?? 'pending') as TwilioVerifyCheckStatus;
  }
}
