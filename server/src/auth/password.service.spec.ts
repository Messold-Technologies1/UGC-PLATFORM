import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PasswordService } from './password.service';
import { EmailTemplateKey } from '../mail/mail.types';

describe('PasswordService', () => {
  const userId = 'user-1';
  const email = 'user@example.com';
  const passwordHash = '$2b$10$hashed';

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    session: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mailMock = {
    send: jest.fn(),
  };

  const configMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'FRONTEND_URL') return 'http://localhost:3000';
      return defaultValue;
    }),
  };

  let service: PasswordService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PasswordService(
      prismaMock as never,
      configMock as never,
      mailMock as never,
    );
  });

  it('forgotPassword sends email for active user with password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      email,
      name: 'Jane',
      passwordHash,
      status: 'ACTIVE',
      deletedAt: null,
    });
    prismaMock.$transaction.mockResolvedValue([]);

    await service.forgotPassword({ email });

    expect(prismaMock.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId, usedAt: null },
    });
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalled();
    expect(mailMock.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        templateKey: EmailTemplateKey.PASSWORD_RESET,
      }),
    );
  });

  it('forgotPassword is silent when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await service.forgotPassword({ email: 'missing@example.com' });

    expect(mailMock.send).not.toHaveBeenCalled();
  });

  it('resetPassword rejects invalid token', async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);

    await expect(
      service.resetPassword({ token: 'bad', newPassword: 'newpassword1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resetPassword updates password and invalidates all sessions', async () => {
    const rawToken = 'reset-token';
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 'token-1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      userId,
      user: {
        id: userId,
        status: 'ACTIVE',
        deletedAt: null,
        passwordHash,
      },
    });
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<void>) => fn(prismaMock),
    );
    prismaMock.passwordResetToken.update.mockResolvedValue({});

    await service.resetPassword({ token: rawToken, newPassword: 'newpassword1' });

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ emailVerified: true }),
      }),
    );
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(prismaMock.passwordResetToken.update).toHaveBeenCalled();
  });

  it('changePassword rejects incorrect current password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      passwordHash,
      status: 'ACTIVE',
      deletedAt: null,
    });

    jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

    await expect(
      service.changePassword(
        userId,
        { currentPassword: 'wrong', newPassword: 'newpassword1' },
        'refresh-token',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changePassword keeps current session and removes others', async () => {
    const refreshToken = 'refresh-token';
    const refreshHash = createHash('sha256').update(refreshToken).digest('hex');

    prismaMock.user.findUnique.mockResolvedValue({
      id: userId,
      passwordHash,
      status: 'ACTIVE',
      deletedAt: null,
    });
    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: typeof prismaMock) => Promise<void>) => fn(prismaMock),
    );

    jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);
    jest.spyOn(require('bcrypt'), 'hash').mockResolvedValue('new-hash');

    await service.changePassword(
      userId,
      { currentPassword: 'oldpassword', newPassword: 'newpassword1' },
      refreshToken,
    );

    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId,
        NOT: { refreshTokenHash: refreshHash },
      },
    });
  });
});
