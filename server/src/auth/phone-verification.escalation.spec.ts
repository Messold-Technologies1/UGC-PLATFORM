import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppCloudTransport } from '../whatsapp/whatsapp-cloud.transport';
import { TwilioOtpTransport } from './twilio-otp.transport';
import { PhoneVerificationService } from './phone-verification.service';

/**
 * The channel ladder is the whole point of the fallback design, and its tier
 * maths is an off-by-one waiting to happen: the Nth send must use the Nth rung,
 * counted BEFORE the new row exists.
 */
describe('PhoneVerificationService channel escalation', () => {
  const phone = '+919876543210';

  /** Count of prior sends in the escalation window, which drives the tier. */
  let priorSends: number;
  let created: Array<{ channel: string; codeHash: string }>;

  const prismaMock = {
    phoneOtp: {
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const whatsappMock = { sendAuthenticationCode: jest.fn() };
  const twilioMock = {
    smsAvailable: jest.fn(),
    verifyAvailable: jest.fn(),
    sendSms: jest.fn(),
    startVerification: jest.fn(),
    checkVerification: jest.fn(),
  };

  /** Env with every tier configured unless a test says otherwise. */
  const env: Record<string, string> = {
    NODE_ENV: 'production',
    WHATSAPP_PHONE_NUMBER_ID: 'pn-1',
    WHATSAPP_ACCESS_TOKEN: 'tok-1',
    JWT_ACCESS_SECRET: 'a-sufficiently-long-test-secret',
  };
  const configMock = {
    get: jest.fn((key: string, fallback?: string) => env[key] ?? fallback),
  };

  function buildService(): PhoneVerificationService {
    return new PhoneVerificationService(
      configMock as unknown as ConfigService,
      prismaMock as unknown as PrismaService,
      whatsappMock as unknown as WhatsAppCloudTransport,
      twilioMock as unknown as TwilioOtpTransport,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    priorSends = 0;
    created = [];

    twilioMock.smsAvailable.mockReturnValue(true);
    twilioMock.verifyAvailable.mockReturnValue(true);
    whatsappMock.sendAuthenticationCode.mockResolvedValue('wamid.1');
    twilioMock.sendSms.mockResolvedValue('SM1');
    twilioMock.startVerification.mockResolvedValue('VE1');

    // No earlier row => no resend cooldown to trip over.
    prismaMock.phoneOtp.findFirst.mockResolvedValue(null);
    prismaMock.phoneOtp.count.mockImplementation(() =>
      Promise.resolve(priorSends),
    );
    prismaMock.phoneOtp.create.mockImplementation(
      ({ data }: { data: { channel: string; codeHash: string } }) => {
        created.push({ channel: data.channel, codeHash: data.codeHash });
        return Promise.resolve({ id: 'otp-1' });
      },
    );
    prismaMock.phoneOtp.update.mockResolvedValue({});
    prismaMock.phoneOtp.updateMany.mockResolvedValue({ count: 0 });
  });

  it('sends the first code over WhatsApp', async () => {
    priorSends = 0;
    await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
      'whatsapp',
    );
    expect(whatsappMock.sendAuthenticationCode).toHaveBeenCalledTimes(1);
    expect(twilioMock.sendSms).not.toHaveBeenCalled();
  });

  it('steps to Twilio SMS on the first resend, carrying our own code', async () => {
    priorSends = 1;
    await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
      'sms',
    );

    expect(twilioMock.sendSms).toHaveBeenCalledWith(
      expect.objectContaining({
        to: phone,
        code: expect.stringMatching(/^\d{6}$/) as unknown as string,
      }),
    );
    // Our code, so it must be stored (hashed) for us to check later.
    expect(created[0].codeHash).not.toBe('');
  });

  it('steps to Twilio Verify on the second resend and stores no code', async () => {
    priorSends = 2;
    await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
      'twilio_verify',
    );
    expect(twilioMock.startVerification).toHaveBeenCalledWith(phone);
    // Twilio owns this code; there is nothing of ours to hash.
    expect(created[0].codeHash).toBe('');
  });

  // 4 prior sends is the most the per-number hourly cap (5) leaves reachable,
  // so the ladder can never run further than this in practice.
  it('stays on the last rung rather than falling back up', async () => {
    priorSends = 4;
    await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
      'twilio_verify',
    );
  });

  it('skips the SMS tier when it is switched off (e.g. no DLT registration)', async () => {
    twilioMock.smsAvailable.mockReturnValue(false);
    priorSends = 1;
    await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
      'twilio_verify',
    );
    expect(twilioMock.sendSms).not.toHaveBeenCalled();
  });

  it('stays on WhatsApp forever when Twilio is not configured at all', async () => {
    twilioMock.smsAvailable.mockReturnValue(false);
    twilioMock.verifyAvailable.mockReturnValue(false);
    priorSends = 4;
    await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
      'whatsapp',
    );
  });

  describe('transport failover', () => {
    /**
     * The rung decides where a send starts, not whether the user gets a code.
     * A dead tier used to fail the whole request — in practice a suspended
     * Twilio account meant every send past the second one in the window died,
     * even though WhatsApp was working the whole time.
     */
    it('falls back to a working tier when the chosen one refuses', async () => {
      priorSends = 2;
      twilioMock.startVerification.mockRejectedValue(
        new Error('authentication failed, account is not active'),
      );

      await expect(buildService().sendVerificationCode(phone)).resolves.toBe(
        'whatsapp',
      );
      expect(whatsappMock.sendAuthenticationCode).toHaveBeenCalledTimes(1);

      // The row must name the tier that actually sent, and carry the code we
      // generated — `verifyCode` branches on exactly these two fields.
      const updates = prismaMock.phoneOtp.update.mock.calls as Array<
        [
          {
            data: { channel: string; codeHash: string; deliveryStatus: string };
          },
        ]
      >;
      const saved = updates.at(-1)?.[0].data;
      expect(saved?.channel).toBe('whatsapp');
      expect(saved?.codeHash).not.toBe('');
      expect(saved?.deliveryStatus).toBe('accepted');
    });

    /**
     * A send that never left our server cost nothing and delivered nothing.
     * Letting it hold the 30s cooldown is what turned one dead tier into
     * "Please wait 19s" on a number that had never been messaged.
     */
    it('ignores never-dispatched rows in the cooldown and the caps', async () => {
      const dispatchedOnly = {
        NOT: { AND: [{ wamid: null }, { deliveryStatus: 'failed' }] },
      };
      priorSends = 0;
      await buildService().sendVerificationCode(phone);

      type WhereCall = [{ where: Record<string, unknown> }];
      const cooldownCalls = prismaMock.phoneOtp.findFirst.mock
        .calls as WhereCall[];
      expect(cooldownCalls.at(-1)?.[0].where).toMatchObject(dispatchedOnly);

      const countCalls = prismaMock.phoneOtp.count.mock.calls as WhereCall[];
      expect(countCalls.length).toBeGreaterThan(0);
      for (const [{ where }] of countCalls) {
        expect(where).toMatchObject(dispatchedOnly);
      }
    });

    it('fails only once every configured tier has refused', async () => {
      priorSends = 0;
      whatsappMock.sendAuthenticationCode.mockRejectedValue(
        new Error('token expired'),
      );
      twilioMock.sendSms.mockRejectedValue(new Error('no DLT template'));
      twilioMock.startVerification.mockRejectedValue(new Error('not active'));

      await expect(buildService().sendVerificationCode(phone)).rejects.toThrow(
        /Could not send the verification code/i,
      );
      expect(whatsappMock.sendAuthenticationCode).toHaveBeenCalledTimes(1);
      expect(twilioMock.sendSms).toHaveBeenCalledTimes(1);
      expect(twilioMock.startVerification).toHaveBeenCalledTimes(1);
    });
  });

  describe('PHONE_OTP_ENABLED kill switch', () => {
    afterEach(() => {
      delete env.PHONE_OTP_ENABLED;
    });

    it('is on by default', () => {
      expect(buildService().otpRequired()).toBe(true);
    });

    it('refuses to send once switched off', async () => {
      env.PHONE_OTP_ENABLED = 'false';
      const service = buildService();
      expect(service.otpRequired()).toBe(false);
      await expect(service.sendVerificationCode(phone)).rejects.toThrow(
        /disabled/i,
      );
      expect(whatsappMock.sendAuthenticationCode).not.toHaveBeenCalled();
      expect(twilioMock.sendSms).not.toHaveBeenCalled();
    });

    it('refuses to verify once switched off, rather than approving blindly', async () => {
      env.PHONE_OTP_ENABLED = 'false';
      await expect(buildService().verifyCode(phone, '123456')).rejects.toThrow(
        /disabled/i,
      );
    });
  });
});
