import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { WatermarkService } from '../watermark/watermark.service';

const QUEUE_NAME = 'delivery-watermark';
const JOB_NAME = 'watermark-delivery';

interface WatermarkJobData {
  deliveryId: string;
}

/**
 * Owns the BullMQ queue + worker for delivery watermarking.
 *
 * - When REDIS_URL is configured, jobs are enqueued to Redis and processed by a
 *   worker (in this process by default; can be split into a dedicated service).
 * - When REDIS_URL is absent (e.g. local dev), watermarking runs inline in the
 *   background so the feature still works without standing up Redis.
 *
 * Either way the database `previewStatus` column is the source of truth, and the
 * reconcile cron (JobsService) re-drives anything left in `pending`.
 */
@Injectable()
export class WatermarkQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WatermarkQueueService.name);
  private readonly enabled: boolean;
  private readonly connection: ConnectionOptions | null;
  private queue: Queue<WatermarkJobData> | null = null;
  private worker: Worker<WatermarkJobData> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly watermark: WatermarkService,
  ) {
    this.enabled = config.get<string>('WATERMARK_ENABLED', 'true') !== 'false';
    const redisUrl = config.get<string>('REDIS_URL');
    this.connection = redisUrl
      ? ({ url: redisUrl } as unknown as ConnectionOptions)
      : null;
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('watermark: disabled via WATERMARK_ENABLED=false');
      return;
    }
    if (!this.connection) {
      this.logger.warn(
        'watermark: REDIS_URL not set — running in inline (no-queue) mode',
      );
      return;
    }

    this.queue = new Queue<WatermarkJobData>(QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    this.worker = new Worker<WatermarkJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.watermark.watermarkDelivery(job.data.deliveryId);
      },
      {
        connection: this.connection,
        // Video encodes run in a child process, so a couple in parallel is fine.
        concurrency: Number(this.config.get('WATERMARK_CONCURRENCY', 2)),
        // FFmpeg jobs outlast the default 30s lock; renew over a longer window.
        lockDuration: 120_000,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `watermark job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });

    this.logger.log('watermark: BullMQ queue + worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /** Queue (or inline-run) watermarking for a delivery. Never throws. */
  async enqueue(deliveryId: string): Promise<void> {
    if (!this.enabled) return;

    if (this.queue) {
      try {
        await this.queue.add(
          JOB_NAME,
          { deliveryId },
          { jobId: `wm:${deliveryId}` },
        );
        return;
      } catch (err) {
        this.logger.error(
          `watermark: enqueue failed for ${deliveryId}, falling back inline: ${(err as Error)?.message}`,
        );
      }
    }

    // Inline fallback — run in the background, don't block the request.
    void this.watermark
      .watermarkDelivery(deliveryId)
      .catch((err) =>
        this.logger.error(
          `watermark: inline run failed for ${deliveryId}: ${(err as Error)?.message}`,
        ),
      );
  }
}
