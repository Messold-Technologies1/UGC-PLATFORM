import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WatermarkQueueService } from './watermark-queue.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly watermarkQueue: WatermarkQueueService,
  ) {}

  /**
   * Safety net for the watermark pipeline: re-drive any delivery still stuck in
   * `pending`/`failed` (dropped enqueue, worker crash, Redis blip). The DB is
   * the source of truth, so a missed job means slower processing — never lost
   * processing.
   */
  @Cron('*/5 * * * *') // every 5 minutes
  async reconcileWatermarks(): Promise<void> {
    const staleBefore = new Date(Date.now() - 10 * 60_000); // 10 minutes old
    const stuck = await this.prisma.orderDelivery.findMany({
      where: {
        previewStatus: { in: ['pending', 'failed'] },
        createdAt: { lte: staleBefore },
        order: { acceptedAt: null },
      },
      select: { id: true },
      take: 50,
    });

    if (stuck.length === 0) return;

    this.logger.log(`watermark_reconcile reEnqueued=${stuck.length}`);
    for (const d of stuck) {
      await this.watermarkQueue.enqueue(d.id);
    }
  }

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
        deliveryGraceDeadlineAt: { lte: now },
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
