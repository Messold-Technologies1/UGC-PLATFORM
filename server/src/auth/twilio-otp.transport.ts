import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

/**
 * Twilio transports for the OTP fallback tiers.
 *
 * Two distinct products, used for two different tiers:
 *
 * - **Programmable Messaging** (`sendSms`) carries OUR code, generated and
 *   checked here exactly like the WhatsApp tier. Cheaper, and keeps a single
 *   code valid across channels.
 * - **Verify** (`startVerification` / `checkVerification`) hands the whole
 *   exchange to Twilio: it generates the code, sends it, and validates it. We
 *   never see the code, so these rows store no hash.
 *
 * Verify is the last resort because it costs the most, but it is also the most
 * likely to land: Twilio owns the carrier relationships and the regional
 * compliance. In India in particular, plain A2P SMS requires TRAI DLT
 * registration (entity id, pre-registered templates, approved sender id) —
 * without it carriers drop the message, which is why the SMS tier can be
 * disabled independently via PHONE_OTP_SMS_ENABLED.
 */
@Injectable()
export class TwilioOtpTransport {
  private readonly logger = new Logger(TwilioOtpTransport.name);

  constructor(private readonly config: ConfigService) {}

  private credentials(): { sid: string; token: string } | null {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID')?.trim();
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN')?.trim();
    if (!sid || !token) return null;
    return { sid, token };
  }

  private client(): ReturnType<typeof twilio> {
    const creds = this.credentials();
    if (!creds) {
      throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
    }
    return twilio(creds.sid, creds.token);
  }

  /** The SMS tier needs credentials, a sender, and no explicit opt-out. */
  smsAvailable(): boolean {
    if (this.config.get<string>('PHONE_OTP_SMS_ENABLED') === 'false') {
      return false;
    }
    if (!this.credentials()) return false;
    return Boolean(
      this.config.get<string>('TWILIO_MESSAGING_SERVICE_SID')?.trim() ||
      this.config.get<string>('TWILIO_FROM_NUMBER')?.trim(),
    );
  }

  /** The Verify tier needs credentials and a Verify service. */
  verifyAvailable(): boolean {
    if (this.config.get<string>('PHONE_OTP_VERIFY_ENABLED') === 'false') {
      return false;
    }
    if (!this.credentials()) return false;
    return Boolean(
      this.config.get<string>('TWILIO_VERIFY_SERVICE_SID')?.trim(),
    );
  }

  /**
   * Send our own code as a plain SMS. Returns Twilio's message SID.
   *
   * Prefers a Messaging Service (which owns sender selection, and on Indian
   * traffic the DLT sender id) over a bare `from` number.
   */
  async sendSms(params: { to: string; code: string }): Promise<string> {
    const messagingServiceSid = this.config
      .get<string>('TWILIO_MESSAGING_SERVICE_SID')
      ?.trim();
    const from = this.config.get<string>('TWILIO_FROM_NUMBER')?.trim();
    const template =
      this.config.get<string>('PHONE_OTP_SMS_TEMPLATE')?.trim() ||
      '{{code}} is your verification code. For your security, do not share this code.';

    // In India the body must match a DLT-registered template, so the copy is
    // configurable rather than hard-coded.
    const body = template.replace('{{code}}', params.code);

    const message = await this.client().messages.create({
      to: params.to,
      body,
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from: from as string }),
    });

    // Never log `body` — it carries the live code.
    this.logger.log(
      `[phone] twilio sms queued to=${params.to} sid=${message.sid} status=${message.status}`,
    );
    return message.sid;
  }

  /**
   * Hand the exchange to Twilio Verify. Twilio generates and sends the code;
   * {@link checkVerification} validates it later. Returns the verification SID.
   */
  async startVerification(to: string): Promise<string> {
    const serviceSid = this.config
      .get<string>('TWILIO_VERIFY_SERVICE_SID')!
      .trim();
    const verification = await this.client()
      .verify.v2.services(serviceSid)
      .verifications.create({ to, channel: 'sms' });
    this.logger.log(
      `[phone] twilio verify started to=${to} sid=${verification.sid} status=${verification.status}`,
    );
    return verification.sid;
  }

  /**
   * Check a code against Twilio Verify.
   *
   * Returns Twilio's own status string (`approved`, `pending`, `canceled`,
   * `max_attempts_reached`, `expired`, ...). A throw here usually means the
   * verification already expired out of Twilio's store — treated as expired by
   * the caller, since a 404 and a timeout are the same thing to the user.
   */
  async checkVerification(to: string, code: string): Promise<string> {
    const serviceSid = this.config
      .get<string>('TWILIO_VERIFY_SERVICE_SID')!
      .trim();
    const check = await this.client()
      .verify.v2.services(serviceSid)
      .verificationChecks.create({ to, code });
    return check.status ?? 'pending';
  }
}
