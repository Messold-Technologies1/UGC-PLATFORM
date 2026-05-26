import { Injectable, Logger } from '@nestjs/common';
import { EmailSuppressionReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailSuppressionService {
  private readonly logger = new Logger(EmailSuppressionService.name);

  constructor(private readonly prisma: PrismaService) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async isSuppressed(email: string): Promise<boolean> {
    const normalized = this.normalizeEmail(email);
    if (!normalized) return false;

    const row = await this.prisma.emailSuppression.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    return Boolean(row);
  }

  async suppress(params: {
    email: string;
    reason: EmailSuppressionReason;
    detail?: string;
  }): Promise<void> {
    const email = this.normalizeEmail(params.email);
    if (!email) return;

    await this.prisma.emailSuppression.upsert({
      where: { email },
      create: {
        email,
        reason: params.reason,
        detail: params.detail ?? null,
      },
      update: {
        reason: params.reason,
        detail: params.detail ?? null,
      },
    });

    this.logger.log(
      `suppressed email=${email} reason=${params.reason}${params.detail ? ` detail=${params.detail}` : ''}`,
    );
  }
}
