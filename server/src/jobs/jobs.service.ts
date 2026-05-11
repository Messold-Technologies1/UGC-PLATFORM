import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Minimal periodic checks. Right now this only logs counts so you can verify
   * the rules are being detected; wire actual notifications later.
   */
  @Cron('0 * * * *') // hourly
  async checkOrderDeadlines(): Promise<void> {
    const now = new Date();

    const briefReminderAt = new Date(now);
    briefReminderAt.setDate(briefReminderAt.getDate() - 3);

    const briefOverdueAt = new Date(now);
    briefOverdueAt.setDate(briefOverdueAt.getDate() - 7);

    const briefReminderCount = await this.prisma.order.count({
      where: {
        status: 'BRIEF_SUBMISSION_PENDING',
        paidAt: { lte: briefReminderAt },
        briefSubmittedAt: null,
      },
    });

    const briefOverdueCount = await this.prisma.order.count({
      where: {
        status: 'BRIEF_SUBMISSION_PENDING',
        paidAt: { lte: briefOverdueAt },
        briefSubmittedAt: null,
      },
    });

    const deliveryOverdueCount = await this.prisma.order.count({
      where: {
        deliveredAt: null,
        deliveryDeadlineAt: { lte: now },
        OR: [
          {
            status: 'BRIEF_ACCEPTED',
            requiresPhysicalProductShipment: false,
          },
          { status: 'PRODUCT_RECEIVED' },
        ],
      },
    });

    this.logger.log(
      `deadline_check briefReminder=${briefReminderCount} briefOverdue=${briefOverdueCount} deliveryOverdue=${deliveryOverdueCount}`,
    );
  }
}
