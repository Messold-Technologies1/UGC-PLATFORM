import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EmailTemplateKey } from '../mail/mail.types';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });

    if (
      !user ||
      user.deletedAt ||
      user.status !== 'ACTIVE' ||
      !user.passwordHash
    ) {
      return;
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
      this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const frontendBase = this.config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .replace(/\/$/, '');

    try {
      await this.mail.send({
        to: user.email,
        templateKey: EmailTemplateKey.PASSWORD_RESET,
        context: {
          recipientName: user.name?.trim() || 'there',
          actionUrl: `${frontendBase}/reset-password?token=${encodeURIComponent(rawToken)}`,
          expiresInMinutes: PASSWORD_RESET_EXPIRY_MS / 60_000,
        },
      });
    } catch (err) {
      this.logger.warn(
        `password reset email failed for user ${user.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token.trim());
    const now = new Date();

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            status: true,
            deletedAt: true,
            passwordHash: true,
          },
        },
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < now ||
      resetToken.user.deletedAt ||
      resetToken.user.status !== 'ACTIVE'
    ) {
      throw new BadRequestException('Invalid or expired reset link');
    }

    await this.applyPasswordChange(resetToken.userId, dto.newPassword, {
      invalidateAllSessions: true,
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    currentRefreshToken?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt || user.status !== 'ACTIVE' || !user.passwordHash) {
      throw new UnauthorizedException();
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from your current password',
      );
    }

    const keepSessionHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : undefined;

    await this.applyPasswordChange(user.id, dto.newPassword, {
      keepRefreshTokenHash: keepSessionHash,
    });
  }

  private async applyPasswordChange(
    userId: string,
    newPassword: string,
    options: {
      invalidateAllSessions?: boolean;
      keepRefreshTokenHash?: string;
    },
  ): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, emailVerified: true },
      });

      if (options.invalidateAllSessions) {
        await tx.session.deleteMany({ where: { userId } });
        return;
      }

      if (options.keepRefreshTokenHash) {
        await tx.session.deleteMany({
          where: {
            userId,
            NOT: { refreshTokenHash: options.keepRefreshTokenHash },
          },
        });
        return;
      }

      await tx.session.deleteMany({ where: { userId } });
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
