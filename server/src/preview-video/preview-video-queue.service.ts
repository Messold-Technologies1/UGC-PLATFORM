import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewVideoService } from './preview-video.service';
import { buildBullmqConnection } from '../jobs/bullmq-redis.connection';
import { shouldRunInline } from '../jobs/bullmq-watchdog.util';

const QUEUE_NAME = 'creator-preview-video';
const JOB_NAME = 'generate-preview';
/** If a queued job is still waiting after this, run a direct background pass. */
const WATCHDOG_MS = 15_000;
/** Cap for the watchdog's own Redis lookups (see WatermarkQueueService). */
const LOOKUP_TIMEOUT_MS = 5_000;
/**
 * Total processing attempts before a creator's preview is parked in the terminal
 * `dead` state, so a poison source (one ffmpeg always chokes on) isn't re-driven
 * forever by retries and the reconcile backstop.
 */
const DEFAULT_MAX_ATTEMPTS = 5;
/**
 * A row claimed into `processing` but not moved on within this window is assumed
 * abandoned (instance crashed mid-run) and may be reclaimed.
 */
const STALE_PROCESSING_MS = 600_000; // 10 min

interface PreviewJobData {
  creatorId: string;
  source?: string;
}

/**
 * Owns the BullMQ queue + worker for creator card-preview generation. Mirrors
 * WatermarkQueueService's posture:
 *
 * - With REDIS_URL set, jobs are enqueued to Redis and processed by the
 *   in-process worker; a watchdog runs a direct pass if the worker never
 *   consumes the job.
 * - Without REDIS_URL (local dev), generation runs inline (best-effort).
 *
 * Unlike watermarking, a missing preview degrades gracefully — the card falls
 * back to the raw intro/portfolio URL — so this pipeline is intentionally
 * leaner (no delayed-recheck job; the hourly reconcile cron is the backstop).
 */
@Injectable()
export class PreviewVideoQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PreviewVideoQueueService.name);
  private readonly enabled: boolean;
  private readonly redisUrl: string | undefined;
  private queue: Queue | null = null;
  private worker: Worker<PreviewJobData> | null = null;
  private inlineActive = 0;
  private readonly inlineWaiters: Array<() => void> = [];
  private readonly processing = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly preview: PreviewVideoService,
    private readonly prisma: PrismaService,
  ) {
    this.enabled =
      config.get<string>('PREVIEW_VIDEO_ENABLED', 'true') !== 'false';
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  private maxAttempts(): number {
    return Math.max(
      1,
      Number(
        this.config.get('PREVIEW_VIDEO_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS),
      ),
    );
  }

  private concurrency(): number {
    return Math.max(1, Number(this.config.get('PREVIEW_VIDEO_CONCURRENCY', 2)));
  }

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
        (err: unknown) => {
          clearTimeout(timer);
          reject(err instanceof Error ? err : new Error(String(err)));
        },
      );
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('preview: disabled via PREVIEW_VIDEO_ENABLED=false');
      return;
    }
    if (!this.redisUrl) {
      this.logger.warn(
        'preview: REDIS_URL not set — running in inline (no-queue) mode',
      );
      return;
    }

    const connection = buildBullmqConnection(this.redisUrl);

    this.queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 4,
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
        'preview: BULLMQ_WORKER_ENABLED=false — queue only (no worker on this process)',
      );
      return;
    }

    this.worker = new Worker<PreviewJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.withTimeout(
          this.processCreatorDirect(
            job.data.creatorId,
            job.data.source ?? 'worker',
          ),
          Math.max(
            60_000,
            Number(this.config.get('PREVIEW_VIDEO_JOB_TIMEOUT_MS', 300_000)),
          ),
          `preview job ${job.id}`,
        );
      },
      {
        connection,
        concurrency: this.concurrency(),
        lockDuration: 60_000,
        stalledInterval: 15_000,
        maxStalledCount: 3,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `preview job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(`preview: worker error: ${err?.message}`);
    });

    await this.worker.waitUntilReady();
    this.logger.log('preview: BullMQ queue + worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /** Queue preview generation for a creator. Never throws. */
  async enqueue(creatorId: string): Promise<void> {
    if (!this.enabled) return;

    if (this.queue) {
      try {
        const jobId = `pv-${creatorId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          await existing.remove().catch(() => undefined);
        }
        await this.queue.add(JOB_NAME, { creatorId }, { jobId });
        setTimeout(() => {
          void this.watchdog(creatorId, jobId);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `preview: enqueue failed for ${creatorId}: ${(err as Error)?.message} (inline fallback)`,
        );
        void this.processCreatorDirect(creatorId, 'enqueue-fallback').catch(
          () => undefined,
        );
        return;
      }
    }

    void this.processCreatorDirect(creatorId, 'inline').catch(() => undefined);
  }

  /**
   * Invalidate any existing rendition and queue a rebuild — the entry point for
   * a source change (portfolio add/remove/replace, Brand-Collab publish, a reel
   * finishing its mirror). Resetting the status lets the claim pick the row up (a
   * `ready` row is otherwise skipped); resetting attempts lets a genuinely new
   * source retry even after a prior source exhausted its budget. Never throws.
   */
  async enqueueDirty(creatorId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: { previewVideoStatus: 'pending', previewVideoAttempts: 0 },
      });
    } catch (err) {
      this.logger.warn(
        `preview: mark dirty failed for ${creatorId}: ${(err as Error)?.message}`,
      );
      return;
    }
    await this.enqueue(creatorId);
  }

  /**
   * Atomically claim a creator for processing — a single conditional UPDATE is
   * the cross-instance lock (an in-memory Set only guards one process). Claims a
   * row that is null/`pending`/`failed`, or one stuck in `processing` past the
   * stale window. Returns the new attempt count, or null when nothing is owed.
   */
  private async claimForProcessing(creatorId: string): Promise<number | null> {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const rows = await this.prisma.$queryRaw<
      Array<{ previewVideoAttempts: number }>
    >`
      UPDATE "CreatorProfile"
      SET "previewVideoStatus" = 'processing',
          "previewVideoAttempts" = "previewVideoAttempts" + 1,
          "previewVideoUpdatedAt" = now()
      WHERE "id" = ${creatorId}::uuid
        AND (
          "previewVideoStatus" IS NULL
          OR "previewVideoStatus" IN ('pending', 'failed')
          OR ("previewVideoStatus" = 'processing' AND "previewVideoUpdatedAt" < ${staleBefore})
        )
      RETURNING "previewVideoAttempts"
    `;
    return rows.length > 0 ? rows[0].previewVideoAttempts : null;
  }

  /**
   * Run generation outside the HTTP request path. Used by the worker, the
   * enqueue watchdog, the inline fallback, and the reconcile poller. The DB
   * claim is the authoritative guard; the in-flight Set is a cheap fast-path.
   */
  async processCreatorDirect(creatorId: string, source: string): Promise<void> {
    if (this.processing.has(creatorId)) return;

    const attempt = await this.claimForProcessing(creatorId);
    if (attempt === null) return; // already ready/dead, or held by another owner

    const max = this.maxAttempts();
    await this.acquireInlineSlot();
    this.processing.add(creatorId);
    try {
      await this.preview.generateForCreator(creatorId);
    } catch (err) {
      await this.markFailed(creatorId).catch(() => undefined);
      if (attempt >= max) {
        await this.markDead(creatorId, attempt, max);
      }
      this.logger.error(
        `preview: ${source} failed for ${creatorId} (attempt ${attempt}/${max}): ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(creatorId);
      this.releaseInlineSlot();
    }
  }

  private async markFailed(creatorId: string): Promise<void> {
    await this.prisma.creatorProfile.update({
      where: { id: creatorId },
      data: { previewVideoStatus: 'failed', previewVideoUpdatedAt: new Date() },
    });
  }

  private async markDead(
    creatorId: string,
    attempt: number,
    max: number,
  ): Promise<void> {
    try {
      await this.prisma.creatorProfile.update({
        where: { id: creatorId },
        data: { previewVideoStatus: 'dead', previewVideoUpdatedAt: new Date() },
      });
      this.logger.error(
        `preview: creator ${creatorId} marked dead after ${attempt}/${max} attempts`,
      );
    } catch (err) {
      this.logger.error(
        `preview: failed to mark ${creatorId} dead: ${(err as Error)?.message}`,
      );
    }
  }

  private async watchdog(creatorId: string, jobId: string): Promise<void> {
    if (!this.queue) return;
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
        runningLocally: this.processing.has(creatorId),
        hasLocalWorker: this.worker != null,
      })
    ) {
      return;
    }

    this.logger.warn(
      `preview: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — direct process`,
    );
    try {
      await this.processCreatorDirect(creatorId, 'watchdog');
    } catch (err) {
      this.logger.error(
        `preview: watchdog run also failed for ${creatorId}: ${(err as Error)?.message}`,
      );
    } finally {
      void this.removeParkedJob(jobId);
    }
  }

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
    if (state === 'active' || state === 'completed' || state === 'unknown') {
      return;
    }
    await job.remove().catch(() => undefined);
  }

  private async acquireInlineSlot(): Promise<void> {
    if (this.inlineActive < this.concurrency()) {
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
