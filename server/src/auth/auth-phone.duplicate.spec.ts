import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthPhoneController } from './auth-phone.controller';
import type { PhoneVerificationService } from './phone-verification.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * A number already on another account must be rejected BEFORE a code goes out,
 * and the refusal has to name the reason: the Google route drops a signed-in
 * user straight onto this field, and an opaque "try again" left them retyping
 * the one number that can never work.
 */
describe('AuthPhoneController duplicate phone', () => {
  const phone = '+919876543210';
  const req = { user: { id: 'user-1' }, header: () => undefined } as unknown as
    Request & { user: { id: string } };

  const prismaMock = {
    user: { findFirst: jest.fn(), update: jest.fn() },
  };
  const phoneVerificationMock = {
    sendVerificationCode: jest.fn(),
    verifyCode: jest.fn(),
  };

  const controller = new AuthPhoneController(
    phoneVerificationMock as unknown as PhoneVerificationService,
    prismaMock as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    phoneVerificationMock.sendVerificationCode.mockResolvedValue('whatsapp');
    phoneVerificationMock.verifyCode.mockResolvedValue('approved');
  });

  it('refuses to send a code to a number held by another account', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'someone-else' });

    await expect(controller.sendOtp({ phone }, req)).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.sendOtp({ phone }, req)).rejects.toThrow(
      /already have an account with this number/i,
    );
    expect(phoneVerificationMock.sendVerificationCode).not.toHaveBeenCalled();
  });

  it('excludes the caller, so re-verifying their own number still sends', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(controller.sendOtp({ phone }, req)).resolves.toEqual({
      channel: 'whatsapp',
    });
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { phone, NOT: { id: 'user-1' } },
      }),
    );
    expect(phoneVerificationMock.sendVerificationCode).toHaveBeenCalledWith(
      phone,
      'profile',
      undefined,
    );
  });

  it('names the same reason on verify, and saves nothing', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'someone-else' });

    await expect(
      controller.verifyOtp({ phone, code: '123456' }, req),
    ).rejects.toThrow(/already have an account with this number/i);
    expect(phoneVerificationMock.verifyCode).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
