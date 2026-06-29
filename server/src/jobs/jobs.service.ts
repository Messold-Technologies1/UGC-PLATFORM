import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WatermarkQueueService } from './watermark-queue.service';

function isPrismaPoolTimeout(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2024'
  );
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private reconcileRunning = false;

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
    if (this.reconcileRunning) return;
    this.reconcileRunning = true;

    try {
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
    } catch (err) {
      if (isPrismaPoolTimeout(err)) {
        this.logger.warn(
          'watermark_reconcile skipped: database connection pool busy (will retry next cron)',
        );
        return;
      }
      throw err;
    } finally {
      this.reconcileRunning = false;
    }
  }

}
