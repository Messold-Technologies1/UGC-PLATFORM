import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MediaNormalizeService } from './media-normalize.service';
import { NORMALIZE_STALE_PROCESSING_MS } from './media-normalize.reconcile';
import { buildBullmqConnection } from '../jobs/bullmq-redis.connection';
import { shouldRunInline } from '../jobs/bullmq-watchdog.util';

const QUEUE_NAME = 'media-normalize';
const JOB_NAME = 'normalize-media';
const WATCHDOG_MS = 15_000;
const LOOKUP_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_ATTEMPTS = 5;

type MediaKind = 'portfolio' | 'intro';

interface NormalizeJobData {
  kind: MediaKind;
  /** Portfolio video id, or creator id for an intro. */
  id: string;
  source?: string;
}

/**
 * BullMQ queue + worker for creator video normalization (portfolio + intro),
 * mirroring PreviewVideoQueueService: Redis-backed with an inline watchdog when
 * a job isn't consumed, and fully inline when REDIS_URL is absent. A missing
 * normalization degrades gracefully (the raw file still plays for most
 * browsers), so this is lean — the reconcile cron is the backstop.
 */
@Injectable()
export class MediaNormalizeQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(MediaNormalizeQueueService.name);
  private readonly enabled: boolean;
  private readonly redisUrl: string | undefined;
  private queue: Queue | null = null;
  private worker: Worker<NormalizeJobData> | null = null;
  private inlineActive = 0;
  private readonly inlineWaiters: Array<() => void> = [];
  private readonly processing = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly normalize: MediaNormalizeService,
    private readonly prisma: PrismaService,
  ) {
    this.enabled =
      config.get<string>('MEDIA_NORMALIZE_ENABLED', 'true') !== 'false';
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  private maxAttempts(): number {
    return Math.max(
      1,
      Number(
        this.config.get('MEDIA_NORMALIZE_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS),
      ),
    );
  }

  private concurrency(): number {
    return Math.max(
      1,
      Number(this.config.get('MEDIA_NORMALIZE_CONCURRENCY', 2)),
    );
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
      this.logger.log('normalize: disabled via MEDIA_NORMALIZE_ENABLED=false');
      return;
    }
    if (!this.redisUrl) {
      this.logger.warn(
        'normalize: REDIS_URL not set — running in inline (no-queue) mode',
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
        'normalize: BULLMQ_WORKER_ENABLED=false — queue only (no worker here)',
      );
      return;
    }

    this.worker = new Worker<NormalizeJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.withTimeout(
          this.processDirect(
            job.data.kind,
            job.data.id,
            job.data.source ?? 'worker',
          ),
          Math.max(
            60_000,
            Number(this.config.get('MEDIA_NORMALIZE_JOB_TIMEOUT_MS', 600_000)),
          ),
          `normalize job ${job.id}`,
        );
      },
      {
        connection,
        concurrency: this.concurrency(),
        lockDuration: 120_000,
        stalledInterval: 30_000,
        maxStalledCount: 3,
      },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `normalize job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(`normalize: worker error: ${err?.message}`);
    });
    await this.worker.waitUntilReady();
    this.logger.log('normalize: BullMQ queue + worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  enqueuePortfolio(videoId: string): Promise<void> {
    return this.enqueue('portfolio', videoId);
  }

  enqueueIntro(creatorId: string): Promise<void> {
    return this.enqueue('intro', creatorId);
  }

  /** Queue normalization. Never throws. */
  private async enqueue(kind: MediaKind, id: string): Promise<void> {
    if (!this.enabled) return;

    if (this.queue) {
      try {
        const jobId = `mn-${kind}-${id}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) await existing.remove().catch(() => undefined);
        await this.queue.add(JOB_NAME, { kind, id }, { jobId });
        setTimeout(() => {
          void this.watchdog(kind, id, jobId);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `normalize: enqueue failed for ${kind}:${id}: ${(err as Error)?.message} (inline fallback)`,
        );
        void this.processDirect(kind, id, 'enqueue-fallback').catch(
          () => undefined,
        );
        return;
      }
    }

    void this.processDirect(kind, id, 'inline').catch(() => undefined);
  }

  /** Atomic claim on the right table; returns the new attempt count or null. */
  private async claim(kind: MediaKind, id: string): Promise<number | null> {
    const staleBefore = new Date(Date.now() - NORMALIZE_STALE_PROCESSING_MS);
    if (kind === 'portfolio') {
      const rows = await this.prisma.$queryRaw<
        Array<{ videoNormalizeAttempts: number }>
      >`
        UPDATE "CreatorPortfolioVideo"
        SET "videoNormalizeStatus" = 'processing',
            "videoNormalizeAttempts" = "videoNormalizeAttempts" + 1,
            "videoNormalizeUpdatedAt" = now()
        WHERE "id" = ${id}::uuid
          AND (
            "videoNormalizeStatus" IS NULL
            OR "videoNormalizeStatus" IN ('pending', 'failed')
            OR ("videoNormalizeStatus" = 'processing' AND "videoNormalizeUpdatedAt" < ${staleBefore})
          )
        RETURNING "videoNormalizeAttempts"
      `;
      return rows.length > 0 ? rows[0].videoNormalizeAttempts : null;
    }
    const rows = await this.prisma.$queryRaw<
      Array<{ introVideoNormalizeAttempts: number }>
    >`
      UPDATE "CreatorProfile"
      SET "introVideoNormalizeStatus" = 'processing',
          "introVideoNormalizeAttempts" = "introVideoNormalizeAttempts" + 1,
          "introVideoNormalizeUpdatedAt" = now()
      WHERE "id" = ${id}::uuid
        AND (
          "introVideoNormalizeStatus" IS NULL
          OR "introVideoNormalizeStatus" IN ('pending', 'failed')
          OR ("introVideoNormalizeStatus" = 'processing' AND "introVideoNormalizeUpdatedAt" < ${staleBefore})
        )
      RETURNING "introVideoNormalizeAttempts"
    `;
    return rows.length > 0 ? rows[0].introVideoNormalizeAttempts : null;
  }

  /** Run normalization outside the request path. Worker/watchdog/inline/poller. */
  async processDirect(
    kind: MediaKind,
    id: string,
    source: string,
  ): Promise<void> {
    const guardKey = `${kind}:${id}`;
    if (this.processing.has(guardKey)) return;

    const attempt = await this.claim(kind, id);
    if (attempt === null) return; // already ready/dead or held elsewhere

    const max = this.maxAttempts();
    await this.acquireInlineSlot();
    this.processing.add(guardKey);
    try {
      if (kind === 'portfolio') {
        await this.normalize.normalizePortfolioVideo(id);
      } else {
        await this.normalize.normalizeIntroVideo(id);
      }
    } catch (err) {
      await this.markFailed(kind, id).catch(() => undefined);
      if (attempt >= max) await this.markDead(kind, id, attempt, max);
      this.logger.error(
        `normalize: ${source} failed for ${guardKey} (attempt ${attempt}/${max}): ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(guardKey);
      this.releaseInlineSlot();
    }
  }

  private async markFailed(kind: MediaKind, id: string): Promise<void> {
    if (kind === 'portfolio') {
      await this.prisma.creatorPortfolioVideo.update({
        where: { id },
        data: {
          videoNormalizeStatus: 'failed',
          videoNormalizeUpdatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.creatorProfile.update({
        where: { id },
        data: {
          introVideoNormalizeStatus: 'failed',
          introVideoNormalizeUpdatedAt: new Date(),
        },
      });
    }
  }

  private async markDead(
    kind: MediaKind,
    id: string,
    attempt: number,
    max: number,
  ): Promise<void> {
    try {
      if (kind === 'portfolio') {
        await this.prisma.creatorPortfolioVideo.update({
          where: { id },
          data: {
            videoNormalizeStatus: 'dead',
            videoNormalizeUpdatedAt: new Date(),
          },
        });
      } else {
        await this.prisma.creatorProfile.update({
          where: { id },
          data: {
            introVideoNormalizeStatus: 'dead',
            introVideoNormalizeUpdatedAt: new Date(),
          },
        });
      }
      this.logger.error(
        `normalize: ${kind}:${id} marked dead after ${attempt}/${max} attempts`,
      );
    } catch (err) {
      this.logger.error(
        `normalize: failed to mark ${kind}:${id} dead: ${(err as Error)?.message}`,
      );
    }
  }

  private async watchdog(
    kind: MediaKind,
    id: string,
    jobId: string,
  ): Promise<void> {
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
        runningLocally: this.processing.has(`${kind}:${id}`),
        hasLocalWorker: this.worker != null,
      })
    ) {
      return;
    }
    this.logger.warn(
      `normalize: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — direct process`,
    );
    try {
      await this.processDirect(kind, id, 'watchdog');
    } catch (err) {
      this.logger.error(
        `normalize: watchdog run also failed for ${kind}:${id}: ${(err as Error)?.message}`,
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
