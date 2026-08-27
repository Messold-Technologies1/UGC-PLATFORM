import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WatermarkService } from '../watermark/watermark.service';
import { buildBullmqConnection } from './bullmq-redis.connection';
import { shouldRunInline } from './bullmq-watchdog.util';

const QUEUE_NAME = 'delivery-watermark';
const JOB_NAME = 'watermark-delivery';
/** If a queued job is still waiting after this, run a direct background pass. */
const WATCHDOG_MS = 15_000;
/**
 * Cap for the watchdog's own Redis lookups. Under maxRetriesPerRequest: null
 * (required by BullMQ) an unreachable Redis makes getJob()/getState() hang
 * forever instead of rejecting, which would strand the watchdog before it can
 * run the delivery inline. Time the lookups out and process anyway.
 */
const LOOKUP_TIMEOUT_MS = 5_000;
/**
 * Delay before the per-delivery self-check job fires. This is the fast,
 * Redis-native recovery path (the "Mailchimp-style" delayed job): if the
 * worker crashed or its blocking connection dropped, the delayed job re-drives
 * the delivery ~2 min later. It no-ops (claim matches 0 rows) when the delivery
 * is already `ready`, so it costs one cheap DB round-trip per delivery — not a
 * standing poll — and lets Neon autosuspend between deliveries.
 */
const RECONCILE_DELAY_MS = 120_000;
/**
 * Total processing attempts allowed before a delivery is parked in the terminal
 * `dead` state. Without this a poison delivery (one that always throws) would be
 * re-driven forever by the worker retries, the delayed job, and the safety-net
 * poller — burning DB/compute indefinitely.
 */
const DEFAULT_MAX_ATTEMPTS = 6;
/**
 * A delivery claimed into `processing` but not moved on within this window is
 * assumed abandoned (instance crashed mid-run) and may be reclaimed. Must be
 * comfortably larger than a real watermark run + any inline-slot wait.
 */
const STALE_PROCESSING_MS = 600_000; // 10 min

interface WatermarkJobData {
  deliveryId: string;
  /** Distinguishes the delayed self-check from the primary job (logging only). */
  source?: string;
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
    private readonly prisma: PrismaService,
  ) {
    this.enabled = config.get<string>('WATERMARK_ENABLED', 'true') !== 'false';
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  private maxAttempts(): number {
    return Math.max(
      1,
      Number(this.config.get('WATERMARK_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS)),
    );
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
    await this.queue.waitUntilReady();

    const workerEnabled =
      this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') !== 'false';
    if (!workerEnabled) {
      this.logger.warn(
        'watermark: BULLMQ_WORKER_ENABLED=false — queue only (no worker on this process)',
      );
      return;
    }

    this.worker = new Worker<WatermarkJobData>(
      QUEUE_NAME,
      async (job) => {
        this.logger.log(
          `watermark: worker picked up ${job.data.deliveryId} (jobId=${job.id})`,
        );
        await this.withTimeout(
          this.processDeliveryDirect(
            job.data.deliveryId,
            job.data.source ?? 'worker',
          ),
          Math.max(
            60_000,
            Number(this.config.get('WATERMARK_JOB_TIMEOUT_MS', 300_000)),
          ),
          `watermark job ${job.id}`,
        );
      },
      {
        connection,
        concurrency: Math.max(
          1,
          Number(this.config.get('WATERMARK_CONCURRENCY', 2)),
        ),
        lockDuration: 60_000,
        stalledInterval: 15_000,
        maxStalledCount: 3,
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
    // Diagnostic: see the note in SocialMetricsQueueService. On managed Redis
    // the worker's blocking connection can drop during idle periods; until it
    // recovers, enqueued jobs sit in `wait` and the watchdog runs them inline.
    this.worker.on('ioredis:close', () => {
      this.logger.warn(
        'watermark: worker Redis connection closed — reconnecting; jobs may sit in `wait` until it recovers',
      );
    });

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

        // Fast, Redis-native safety net: a delayed self-check that re-drives the
        // delivery if the worker never completed it. Deterministic jobId dedupes
        // repeat enqueues; it no-ops once the delivery is `ready`. This does NOT
        // replace the DB-truth poller (Redis can't guard against its own loss) —
        // it just shortens recovery for the common worker-crash case.
        await this.queue
          .add(
            JOB_NAME,
            { deliveryId, source: 'delayed-recheck' },
            { jobId: `wm-recheck-${deliveryId}`, delay: RECONCILE_DELAY_MS },
          )
          .catch((err) =>
            this.logger.warn(
              `watermark: could not schedule delayed recheck for ${deliveryId}: ${(err as Error)?.message}`,
            ),
          );

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

        // NB: a freshly added job is expected to sit in `wait` for the brief
        // moment before the worker moves it to `active`, so we do NOT treat
        // wait>0/active===0 here as a fault. The watchdog below is the real
        // signal — it only fires (and logs diagnostics) if the job is still
        // unconsumed after WATCHDOG_MS.

        setTimeout(() => {
          void this.watchdog(deliveryId, jobId);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `watermark: enqueue failed for ${deliveryId}: ${(err as Error)?.message} (direct process fallback)`,
        );
        void this.runInlineGuarded(deliveryId, 'enqueue-fallback');
        return;
      }
    }

    void this.runInlineGuarded(deliveryId, 'inline');
  }

  /**
   * processDeliveryDirect for the fire-and-forget callers. It rethrows so the
   * worker can retry, but a `void` call has nowhere to put that and Node treats
   * an unhandled rejection as fatal. Safe to swallow: the failure is logged, the
   * row is already `failed` (or `dead` once the budget is spent), and the
   * reconcile poller re-drives anything recoverable.
   */
  private async runInlineGuarded(
    deliveryId: string,
    source: string,
  ): Promise<void> {
    await this.processDeliveryDirect(deliveryId, source).catch(() => undefined);
  }

  /**
   * Atomically claim a delivery for processing. A single conditional UPDATE is
   * the cross-instance lock: only the caller whose UPDATE flips the row wins, so
   * the worker, watchdog, delayed recheck and safety-net poller can never
   * double-process — even across horizontally-scaled instances (an in-memory Set
   * only guards a single process).
   *
   * Claims a row that is `pending`/`failed`, or one stuck in `processing` past
   * the stale window (crashed mid-run). Increments the attempt counter.
   *
   * Returns the new attempt count if claimed, or null if another owner holds it
   * / it is already `ready` or `dead`.
   */
  private async claimForProcessing(deliveryId: string): Promise<number | null> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const rows = await this.prisma.$queryRaw<
      Array<{ previewAttempts: number }>
    >`
      UPDATE "OrderDelivery"
      SET "previewStatus" = 'processing',
          "previewAttempts" = "previewAttempts" + 1,
          "previewUpdatedAt" = now()
      WHERE "id" = ${deliveryId}::uuid
        AND (
          "previewStatus" IN ('pending', 'failed')
          OR ("previewStatus" = 'processing' AND "previewUpdatedAt" < ${staleBefore})
        )
      RETURNING "previewAttempts"
    `;
    return rows.length > 0 ? rows[0].previewAttempts : null;
  }

  /**
   * Run watermarking outside the HTTP request path. Used by the BullMQ worker,
   * the enqueue watchdog, the delayed recheck job, and the safety-net poller.
   *
   * A local in-flight Set is a cheap fast-path to skip a redundant DB round-trip
   * when this same process is already handling the delivery; the DB claim is the
   * real, authoritative guard.
   */
  async processDeliveryDirect(
    deliveryId: string,
    source: string,
  ): Promise<void> {
    if (this.processing.has(deliveryId)) return;

    const attempt = await this.claimForProcessing(deliveryId);
    if (attempt === null) {
      // Already ready/dead, or another owner holds the claim — nothing to do.
      return;
    }

    const max = this.maxAttempts();
    await this.acquireInlineSlot();
    this.processing.add(deliveryId);
    try {
      this.logger.log(
        `watermark: ${source} processing ${deliveryId} (attempt ${attempt}/${max})`,
      );
      await this.watermark.watermarkDelivery(deliveryId);
    } catch (err) {
      // watermarkDelivery has already flipped the row to `failed`. If the retry
      // budget is spent, park it in the terminal `dead` state so nothing keeps
      // re-driving a poison delivery.
      if (attempt >= max) {
        await this.markDead(deliveryId, attempt, max);
      }
      this.logger.error(
        `watermark: ${source} failed for ${deliveryId} (attempt ${attempt}/${max}): ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(deliveryId);
      this.releaseInlineSlot();
    }
  }

  /** Park a delivery in the terminal `dead` state after the retry budget is spent. */
  private async markDead(
    deliveryId: string,
    attempt: number,
    max: number,
  ): Promise<void> {
    try {
      await this.prisma.orderDelivery.update({
        where: { id: deliveryId },
        data: { previewStatus: 'dead', previewUpdatedAt: new Date() },
      });
      this.logger.error(
        `watermark: delivery ${deliveryId} marked dead after ${attempt}/${max} attempts`,
      );
    } catch (err) {
      this.logger.error(
        `watermark: failed to mark ${deliveryId} dead: ${(err as Error)?.message}`,
      );
    }
  }

  private async watchdog(deliveryId: string, jobId: string): Promise<void> {
    if (!this.queue) return;

    // Bound these lookups (see LOOKUP_TIMEOUT_MS): under maxRetriesPerRequest:
    // null an unreachable Redis makes getJob()/getState() hang forever, which
    // would strand the watchdog here and never process the delivery. On timeout
    // assume it is unconsumed and proceed.
    const job = await this.withTimeout(
      this.queue.getJob(jobId),
      LOOKUP_TIMEOUT_MS,
      'watchdog getJob',
    ).catch(() => null);
    const state = job
      ? await this.withTimeout(
          job.getState(),
          LOOKUP_TIMEOUT_MS,
          'watchdog getState',
        ).catch(() => 'unknown')
      : 'missing';
    if (
      !shouldRunInline({
        state,
        runningLocally: this.processing.has(deliveryId),
        hasLocalWorker: this.worker != null,
      })
    ) {
      return;
    }

    this.logger.warn(
      `watermark: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — direct process`,
    );
    // Fire-and-forget: its getWorkers() can hang the same way and must not delay
    // the inline pass.
    void this.logWorkerDiagnostics();
    try {
      await this.processDeliveryDirect(deliveryId, 'watchdog');
    } catch (err) {
      // processDeliveryDirect logs the cause; this says the rescue also failed,
      // which is what distinguishes "one bad run" from "nothing is working".
      this.logger.error(
        `watermark: watchdog run also failed for ${deliveryId}: ${(err as Error)?.message}`,
      );
    } finally {
      // The worker never consumed this job (still `wait`/`delayed`). Clear the
      // leftover under the fixed jobId so a later-recovering worker doesn't
      // redundantly re-run a delivery we just processed directly. The reconcile
      // poller still covers anything that failed here. Fire-and-forget +
      // bounded internally so a hung Redis lookup can't strand the watchdog.
      void this.removeParkedJob(jobId);
    }
  }

  /**
   * Remove a leftover job by id unless the worker has meanwhile picked it up.
   * Used by the watchdog to stop an unconsumed job lingering under the fixed
   * jobId. Lookups are bounded; if state can't be read, skip removal. Never throws.
   */
  private async removeParkedJob(jobId: string): Promise<void> {
    if (!this.queue) return;
    const job = await this.withTimeout(
      this.queue.getJob(jobId),
      LOOKUP_TIMEOUT_MS,
      'removeParkedJob getJob',
    ).catch(() => null);
    if (!job) return;
    const state = await this.withTimeout(
      job.getState(),
      LOOKUP_TIMEOUT_MS,
      'removeParkedJob getState',
    ).catch(() => 'unknown');
    // 'unknown' = lookup failed/timed out; don't risk removing a job we can't read.
    if (state === 'active' || state === 'completed' || state === 'unknown') {
      return;
    }
    await job.remove().catch(() => undefined);
  }

  private async logWorkerDiagnostics(): Promise<void> {
    if (!this.queue || !this.worker) return;
    const workers = await this.withTimeout(
      this.queue.getWorkers(),
      LOOKUP_TIMEOUT_MS,
      'getWorkers',
    ).catch(() => []);
    this.logger.warn(
      `watermark: diagnostics workersRegistered=${workers.length} isRunning=${this.worker.isRunning()} isPaused=${this.worker.isPaused()}`,
    );
  }

  private inlineConcurrency(): number {
    return Math.max(1, Number(this.config.get('WATERMARK_CONCURRENCY', 2)));
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
