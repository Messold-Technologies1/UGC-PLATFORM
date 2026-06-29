import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { WatermarkService } from '../watermark/watermark.service';
import { buildBullmqConnection } from './bullmq-redis.connection';

const QUEUE_NAME = 'delivery-watermark';
const JOB_NAME = 'watermark-delivery';
/** If a queued job is still waiting after this, run a direct background pass. */
const WATCHDOG_MS = 15_000;

interface WatermarkJobData {
  deliveryId: string;
}

/**
 * Owns the BullMQ queue + worker for delivery watermarking.
 *
 * - When REDIS_URL is configured (production), jobs are enqueued to Redis and
 *   processed by the in-process BullMQ worker. A watchdog + reconcile poller
 *   process stuck deliveries directly when the worker fails to consume.
 * - When REDIS_URL is absent (local dev), watermarking runs inline.
 */
@Injectable()
export class WatermarkQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WatermarkQueueService.name);
  private readonly enabled: boolean;
  private readonly redisUrl: string | undefined;
  private queue: Queue | null = null;
  private worker: Worker<WatermarkJobData> | null = null;
  /** Limits concurrent direct / inline runs so Prisma pool isn't exhausted. */
  private inlineActive = 0;
  private readonly inlineWaiters: Array<() => void> = [];
  private readonly processing = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly watermark: WatermarkService,
  ) {
    this.enabled = config.get<string>('WATERMARK_ENABLED', 'true') !== 'false';
    this.redisUrl = config.get<string>('REDIS_URL');
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

  async onModuleInit(): Promise<void> {
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

    const connection = buildBullmqConnection(this.redisUrl);

    this.queue = new Queue(QUEUE_NAME, {
      connection,
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
        await this.withTimeout(
          this.processDeliveryDirect(job.data.deliveryId, 'worker'),
          Math.max(
            60_000,
            Number(this.config.get('WATERMARK_JOB_TIMEOUT_MS', 300_000)),
          ),
          `watermark job ${job.id}`,
        );
      },
      {
        connection,
        concurrency: Number(this.config.get('WATERMARK_CONCURRENCY', 2)),
        lockDuration: 120_000,
      },
    );

    this.worker.on('ready', () => {
      this.logger.log('watermark: worker ready (listening for jobs)');
    });
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

    await this.queue.waitUntilReady();
    await this.worker.waitUntilReady();

    const workers = await this.queue.getWorkers().catch(() => []);
    this.logger.log(
      `watermark: BullMQ queue + worker started (${workers.length} worker(s) registered in Redis)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /** Queue watermarking for a delivery. Never throws. */
  async enqueue(deliveryId: string): Promise<void> {
    if (!this.enabled) return;

    if (this.queue) {
      try {
        const jobId = `wm-${deliveryId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          await existing.remove().catch(() => undefined);
        }
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

        if (counts && counts.wait > 0 && counts.active === 0) {
          void this.logWorkerDiagnostics();
        }

        setTimeout(() => {
          void this.watchdog(deliveryId, jobId);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `watermark: enqueue failed for ${deliveryId}: ${(err as Error)?.message} (direct process fallback)`,
        );
        void this.processDeliveryDirect(deliveryId, 'enqueue-fallback');
        return;
      }
    }

    void this.processDeliveryDirect(deliveryId, 'inline');
  }

  /**
   * Run watermarking outside the HTTP request path. Used by the BullMQ worker,
   * the enqueue watchdog, and the reconcile poller when jobs sit in `wait`.
   */
  async processDeliveryDirect(
    deliveryId: string,
    source: string,
  ): Promise<void> {
    if (this.processing.has(deliveryId)) return;

    await this.acquireInlineSlot();
    this.processing.add(deliveryId);
    try {
      this.logger.log(`watermark: ${source} processing ${deliveryId}`);
      await this.watermark.watermarkDelivery(deliveryId);
    } catch (err) {
      this.logger.error(
        `watermark: ${source} failed for ${deliveryId}: ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(deliveryId);
      this.releaseInlineSlot();
    }
  }

  private async watchdog(deliveryId: string, jobId: string): Promise<void> {
    if (!this.queue) return;

    const job = await this.queue.getJob(jobId).catch(() => null);
    const state = job ? await job.getState().catch(() => 'unknown') : 'missing';
    if (state === 'completed' || state === 'active') return;

    this.logger.warn(
      `watermark: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — direct process`,
    );
    await this.logWorkerDiagnostics();
    try {
      await this.processDeliveryDirect(deliveryId, 'watchdog');
    } catch {
      // watermarkDelivery logs; reconcile poller will retry
    }
  }

  private async logWorkerDiagnostics(): Promise<void> {
    if (!this.queue || !this.worker) return;
    const workers = await this.queue.getWorkers().catch(() => []);
    this.logger.warn(
      `watermark: diagnostics workersRegistered=${workers.length} isRunning=${this.worker.isRunning()} isPaused=${this.worker.isPaused()}`,
    );
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
}
