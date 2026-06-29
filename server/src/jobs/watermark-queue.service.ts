import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
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
  private readonly redisUrl: string | undefined;
  private queue: Queue<WatermarkJobData> | null = null;
  private worker: Worker<WatermarkJobData> | null = null;
  private queueConnection: Redis | null = null;
  private workerConnection: Redis | null = null;
  /** Limits concurrent inline runs so Prisma pool isn't exhausted without Redis. */
  private inlineActive = 0;
  private readonly inlineWaiters: Array<() => void> = [];

  constructor(
    private readonly config: ConfigService,
    private readonly watermark: WatermarkService,
  ) {
    this.enabled = config.get<string>('WATERMARK_ENABLED', 'true') !== 'false';
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  /**
   * A dedicated ioredis connection. BullMQ workers issue blocking commands, so
   * the queue and the worker MUST NOT share a connection, and every connection
   * must use `maxRetriesPerRequest: null` — otherwise the blocking client can
   * silently stop polling after a reconnect and jobs pile up in `wait` with no
   * error (the bug we hit on Railway Redis).
   */
  private createConnection(label: string): Redis {
    const conn = new Redis(this.redisUrl as string, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    conn.on('error', (err) =>
      this.logger.error(`watermark: redis ${label} error: ${err?.message}`),
    );
    return conn;
  }

  /** Reject if a promise hasn't settled within `ms`. */
  private withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      );
      p.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log('watermark: disabled via WATERMARK_ENABLED=false');
      return;
    }
    if (!this.redisUrl) {
      this.logger.warn(
        'watermark: REDIS_URL not set — running in inline (no-queue) mode',
      );
      return;
    }

    // Separate, dedicated connections for the queue and the worker.
    this.queueConnection = this.createConnection('queue');
    this.workerConnection = this.createConnection('worker');

    this.queue = new Queue<WatermarkJobData>(QUEUE_NAME, {
      connection: this.queueConnection,
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
        this.logger.log(
          `watermark: worker picked up ${job.data.deliveryId} (jobId=${job.id})`,
        );
        // Hard ceiling on the whole job. The ffmpeg step has its own timeout,
        // but S3 download/upload have none — a stalled stream would otherwise
        // hold the worker slot forever and freeze the queue. This guarantees a
        // hung job fails, frees the slot, and is retried.
        await this.withTimeout(
          this.watermark.watermarkDelivery(job.data.deliveryId),
          Math.max(
            60_000,
            Number(this.config.get('WATERMARK_JOB_TIMEOUT_MS', 300_000)),
          ),
          `watermark job ${job.id}`,
        );
      },
      {
        connection: this.workerConnection,
        // Video encodes run in a child process, so a couple in parallel is fine.
        concurrency: Number(this.config.get('WATERMARK_CONCURRENCY', 2)),
        // FFmpeg jobs outlast the default 30s lock; renew over a longer window.
        lockDuration: 120_000,
      },
    );

    // Full observability — previously only `failed` was logged, so a stalled
    // job or a dropped Redis connection happened silently (job stuck pending,
    // no log). These handlers surface exactly where a job dies.
    this.worker.on('active', (job) => {
      this.logger.log(`watermark: job active ${job.id}`);
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`watermark: job completed ${job.id}`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `watermark job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('stalled', (jobId) => {
      this.logger.warn(`watermark: job stalled ${jobId}`);
    });
    this.worker.on('error', (err) => {
      this.logger.error(`watermark: worker error: ${err?.message}`);
    });

    this.logger.log('watermark: BullMQ queue + worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    this.workerConnection?.disconnect();
    this.queueConnection?.disconnect();
  }

  /** Queue (or inline-run) watermarking for a delivery. Never throws. */
  async enqueue(deliveryId: string): Promise<void> {
    if (!this.enabled) return;

    if (this.queue) {
      try {
        // Remove any prior job with this id first. BullMQ treats `add` with an
        // existing jobId (still in the completed/failed set) as a no-op, which
        // would silently drop re-enqueues for reconciles, regenerations and
        // revisions. Removing first guarantees the delivery is reprocessed.
        const jobId = `wm-${deliveryId}`;
        await this.queue.remove(jobId).catch(() => undefined);
        await this.queue.add(JOB_NAME, { deliveryId }, { jobId });
        const counts = await this.queue
          .getJobCounts('wait', 'active', 'delayed', 'failed')
          .catch(() => null);
        this.logger.log(
          `watermark: enqueued ${deliveryId} (jobId=${jobId})${
            counts
              ? ` [wait=${counts.wait} active=${counts.active} delayed=${counts.delayed} failed=${counts.failed}]`
              : ''
          }`,
        );
        return;
      } catch (err) {
        this.logger.error(
          `watermark: enqueue failed for ${deliveryId}, falling back inline: ${(err as Error)?.message}`,
        );
      }
    }

    // Inline fallback — bounded concurrency so reconcile/dev can't stampede the DB pool.
    void this.runInline(deliveryId);
  }

  private inlineConcurrency(): number {
    return Math.max(
      1,
      Number(this.config.get('WATERMARK_CONCURRENCY', 2)),
    );
  }

  private async acquireInlineSlot(): Promise<void> {
    if (this.inlineActive < this.inlineConcurrency()) {
      this.inlineActive++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.inlineWaiters.push(resolve);
    });
    this.inlineActive++;
  }

  private releaseInlineSlot(): void {
    this.inlineActive = Math.max(0, this.inlineActive - 1);
    const next = this.inlineWaiters.shift();
    if (next) next();
  }

  private async runInline(deliveryId: string): Promise<void> {
    await this.acquireInlineSlot();
    try {
      await this.watermark.watermarkDelivery(deliveryId);
    } catch (err) {
      this.logger.error(
        `watermark: inline run failed for ${deliveryId}: ${(err as Error)?.message}`,
      );
    } finally {
      this.releaseInlineSlot();
    }
  }
}
