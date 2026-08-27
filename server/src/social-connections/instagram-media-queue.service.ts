import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import { buildBullmqConnection } from '../jobs/bullmq-redis.connection';
import { shouldRunInline } from '../jobs/bullmq-watchdog.util';
import { withTimeout } from '../util/with-timeout';
import {
  InstagramMediaService,
  type IgSyncMode,
} from './instagram-media.service';
import { type InstagramUsage } from './instagram.client';

const QUEUE_NAME = 'instagram-media-sync';
const JOB_NAME = 'sync-media';

/** Job priority — BullMQ serves the lowest number first. */
export const IG_SYNC_PRIORITY = {
  /** A creator is watching a spinner right now. */
  interactive: 1,
  /** Fired from the OAuth callback so the cache is warm before they click. */
  prewarm: 5,
  /** Nightly staleness pass. Must never delay the two above. */
  cron: 10,
} as const;

/** If a queued job is still unconsumed after this, run it inline. */
const WATCHDOG_MS = 15_000;
/** Cap for the watchdog's own Redis lookups (see SocialMetricsQueueService). */
const LOOKUP_TIMEOUT_MS = 5_000;
/** Upper bound on one sync — a full page walk plus upserts. */
const SYNC_TIMEOUT_MS = 180_000;

/** Usage percentage above which the whole queue slows down. */
const USAGE_SLOW_PCT = 75;
/** Usage percentage above which the queue pauses outright. */
const USAGE_PAUSE_PCT = 90;
const SLOW_MS = 60_000;
const PAUSE_MS = 10 * 60_000;
/** Consecutive rate-limit hits before the breaker trips. */
const BREAKER_THRESHOLD = 5;
const BREAKER_PAUSE_MS = 15 * 60_000;

interface SyncJobData {
  connectionId: string;
  /** See IgSyncMode. Absent (e.g. a job enqueued by an older build) is 'auto'. */
  mode?: IgSyncMode;
}

/**
 * Queue + worker for the Instagram reel cache.
 *
 * Shaped after SocialMetricsQueueService — same watchdog, same inline fallback
 * when REDIS_URL is absent, same fixed-jobId de-duplication including the sweep
 * of a retained finished job (without which one leftover would silently block
 * every future sync for that connection).
 *
 * What is new here is rate-limit defence. The hard ceiling is BullMQ's limiter;
 * on top of that the worker reads Meta's usage headers after each sync and
 * slows or pauses the whole queue, so a hundred creators arriving at once
 * cannot outrun the budget however they arrive.
 */
@Injectable()
export class InstagramMediaQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InstagramMediaQueueService.name);
  private readonly redisUrl: string | undefined;
  private queue: Queue<SyncJobData> | null = null;
  private worker: Worker<SyncJobData> | null = null;
  private readonly processing = new Set<string>();
  private consecutiveRateLimits = 0;
  /** Wall-clock until which the queue is deliberately held back. */
  private throttledUntil = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly media: InstagramMediaService,
  ) {
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  private enabled(): boolean {
    return this.config.get<string>('IG_MEDIA_SYNC_ENABLED') !== 'false';
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled()) {
      this.logger.warn(
        'ig-media: IG_MEDIA_SYNC_ENABLED=false — syncs disabled',
      );
      return;
    }
    if (!this.redisUrl) {
      this.logger.warn(
        'ig-media: REDIS_URL not set — running syncs inline (no queue, no limiter)',
      );
      return;
    }

    const connection = buildBullmqConnection(this.redisUrl);
    this.queue = new Queue<SyncJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });
    await this.queue.waitUntilReady();

    // Same convention as the other queues: only the replica with
    // BULLMQ_WORKER_ENABLED opens a consumer. That is also what makes the
    // limiter below a genuinely global ceiling rather than a per-replica one.
    if (this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') === 'false') {
      this.logger.warn(
        'ig-media: BULLMQ_WORKER_ENABLED=false — queue only (no worker here)',
      );
      return;
    }

    const concurrency = Math.max(
      1,
      Number(this.config.get('IG_MEDIA_CONCURRENCY', 3)),
    );
    const rateMax = Math.max(
      1,
      Number(this.config.get('IG_MEDIA_RATE_MAX', 5)),
    );

    this.worker = new Worker<SyncJobData>(
      QUEUE_NAME,
      async (job) => this.runJob(job),
      {
        connection,
        concurrency,
        // The hard ceiling. Excess jobs queue rather than hitting Graph.
        limiter: { max: rateMax, duration: 1000 },
        // Must outlast SYNC_TIMEOUT_MS, or a sync still legitimately running at
        // 120s loses its lock, gets reclaimed as stalled, and a second worker
        // walks the same account — the exact duplicate the limiter above exists
        // to prevent. The mirror queue already sizes it this way (360s lock for
        // a 300s timeout); this one did not.
        lockDuration: SYNC_TIMEOUT_MS + 60_000,
        stalledInterval: 30_000,
        maxStalledCount: 3,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `ig-media: job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(`ig-media worker error: ${err?.message}`);
    });
    this.worker.on('ioredis:close', () => {
      this.logger.warn(
        'ig-media: worker Redis connection closed — jobs may sit in `wait` until it recovers',
      );
    });

    await this.worker.waitUntilReady();
    this.logger.log(
      `ig-media: queue + worker ready (concurrency=${concurrency}, ${rateMax} req/s ceiling)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /**
   * Queue a sync (or run it inline without Redis). Never throws — a failure to
   * enqueue must not fail the request that asked for it.
   */
  async enqueue(
    connectionId: string,
    opts: { priority?: number; mode?: IgSyncMode } = {},
  ): Promise<void> {
    if (!this.enabled()) return;
    const priority = opts.priority ?? IG_SYNC_PRIORITY.interactive;

    await this.media.markQueued(connectionId).catch(() => undefined);

    if (this.queue) {
      try {
        const jobId = `igmedia-${connectionId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          const state = await existing.getState();
          if (state === 'completed' || state === 'failed') {
            // A retained finished job would otherwise block this id forever.
            await existing.remove().catch(() => undefined);
          } else if (state === 'active' && !this.processing.has(connectionId)) {
            this.logger.warn(
              `ig-media: orphaned active job ${jobId} — syncing inline`,
            );
            void this.runInlineGuarded(
              connectionId,
              'orphan-active',
              opts.mode,
            );
            return;
          } else {
            this.logger.log(
              `ig-media: sync already queued for ${connectionId} (${state})`,
            );
            return;
          }
        }
        await this.queue.add(
          JOB_NAME,
          { connectionId, mode: opts.mode },
          { jobId, priority },
        );
        setTimeout(() => {
          void this.watchdog(connectionId, jobId, opts.mode);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `ig-media: enqueue failed for ${connectionId}: ${(err as Error)?.message} (inline fallback)`,
        );
      }
    }
    void this.runInlineGuarded(connectionId, 'inline', opts.mode);
  }

  private async runJob(job: Job<SyncJobData>): Promise<void> {
    await this.holdIfThrottled(job);
    const usage = await this.runDirect(
      job.data.connectionId,
      'worker',
      job.data.mode,
    );
    await this.applyBackpressure(job, usage);
  }

  /**
   * Honour a cool-down the previous job established, before spending a call.
   * `Worker.rateLimit` throws a delayed-retry signal, so this must be the first
   * thing a job does.
   */
  private async holdIfThrottled(job: Job<SyncJobData>): Promise<void> {
    const remaining = this.throttledUntil - Date.now();
    if (remaining > 0 && this.worker) {
      this.logger.warn(
        `ig-media: holding ${job.id} for ${Math.ceil(remaining / 1000)}s (throttle window)`,
      );
      await this.worker.rateLimit(remaining);
      throw Worker.RateLimitError();
    }
  }

  /**
   * Steer by Meta's own telemetry rather than a hard-coded quota: the formula
   * has changed more than once and differs between the Instagram-Login and
   * Facebook-Login variants, but the percentages are always meaningful.
   */
  private async applyBackpressure(
    job: Job<SyncJobData>,
    usage: InstagramUsage | null,
  ): Promise<void> {
    if (!usage) return;
    const peak = this.media.peakUsage(usage);

    if (usage.estimatedTimeToRegainAccessMin != null) {
      // Meta told us exactly how long to wait. Honour it precisely.
      const ms = usage.estimatedTimeToRegainAccessMin * 60_000;
      this.throttledUntil = Date.now() + ms;
      this.logger.warn(
        `ig-media: Meta asked for ${usage.estimatedTimeToRegainAccessMin}min cool-down`,
      );
      return;
    }

    if (peak >= USAGE_PAUSE_PCT) {
      this.throttledUntil = Date.now() + PAUSE_MS;
      this.logger.warn(
        `ig-media: usage at ${peak}% — pausing the queue for ${PAUSE_MS / 60_000}min`,
      );
      return;
    }
    if (peak >= USAGE_SLOW_PCT) {
      this.throttledUntil = Date.now() + SLOW_MS;
      this.logger.warn(`ig-media: usage at ${peak}% — slowing the queue`);
    }
  }

  /** Run a sync outside the request path. De-duplicates concurrent runs. */
  async runDirect(
    connectionId: string,
    source: string,
    mode?: IgSyncMode,
  ): Promise<InstagramUsage | null> {
    // The worker is authoritative and must never be skipped, or a job completes
    // having made zero Graph calls. Only best-effort callers defer.
    if (source !== 'worker' && this.processing.has(connectionId)) {
      this.logger.log(
        `ig-media: ${source} skipped ${connectionId} — a sync is already running`,
      );
      return null;
    }
    this.processing.add(connectionId);
    const startedAt = Date.now();
    try {
      const result = await withTimeout(
        this.media.syncConnectionMedia(connectionId, { mode }),
        SYNC_TIMEOUT_MS,
        `ig-media ${source} sync ${connectionId}`,
      );
      this.consecutiveRateLimits = 0;
      return result.usage;
    } catch (err) {
      this.noteFailure(err);
      // The sibling this queue was modelled on (SocialMetricsQueueService) logs
      // here and this one did not, so a failure on any non-worker path — inline,
      // watchdog, orphan-active — left no trace in the logs at all. The only
      // record was `lastError` in Postgres.
      this.logger.error(
        `ig-media: ${source} sync failed for ${connectionId} after ${Date.now() - startedAt}ms: ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(connectionId);
    }
  }

  /**
   * `runDirect` for the fire-and-forget callers. Swallowing here is deliberate —
   * the error is already logged and recorded on the sync state, and an unhandled
   * rejection from a `void` call would otherwise reach the process handler.
   */
  private async runInlineGuarded(
    connectionId: string,
    source: string,
    mode?: IgSyncMode,
  ): Promise<void> {
    await this.runDirect(connectionId, source, mode).catch(() => undefined);
  }

  /**
   * Trip the breaker after repeated rate-limit errors. Failing visibly for a
   * quarter of an hour beats hammering an endpoint that is already refusing us.
   */
  private noteFailure(err: unknown): void {
    const rateLimited = Boolean(
      (err as { rateLimited?: boolean } | null)?.rateLimited,
    );
    if (!rateLimited) {
      this.consecutiveRateLimits = 0;
      return;
    }
    this.consecutiveRateLimits++;
    if (this.consecutiveRateLimits >= BREAKER_THRESHOLD) {
      this.throttledUntil = Date.now() + BREAKER_PAUSE_MS;
      this.consecutiveRateLimits = 0;
      this.logger.error(
        `ig-media: ${BREAKER_THRESHOLD} consecutive rate limits — breaker open for ${BREAKER_PAUSE_MS / 60_000}min`,
      );
    }
  }

  /**
   * If the job is still unconsumed after WATCHDOG_MS, run it inline. `active` is
   * not treated as healthy: a stale consumer can claim a job with no live
   * handler on this process, which is exactly the failure this catches.
   */
  private async watchdog(
    connectionId: string,
    jobId: string,
    mode?: IgSyncMode,
  ): Promise<void> {
    if (!this.queue) return;
    const job = await withTimeout(
      this.queue.getJob(jobId),
      LOOKUP_TIMEOUT_MS,
      'ig-media watchdog getJob',
    ).catch(() => null);
    const state = job
      ? await withTimeout(
          job.getState(),
          LOOKUP_TIMEOUT_MS,
          'ig-media watchdog getState',
        ).catch(() => 'unknown')
      : 'missing';

    if (
      !shouldRunInline({
        state,
        runningLocally: this.processing.has(connectionId),
        hasLocalWorker: this.worker != null,
        throttled: this.throttledUntil > Date.now(),
      })
    ) {
      return;
    }

    this.logger.warn(
      `ig-media: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — syncing directly`,
    );
    try {
      await this.runDirect(connectionId, 'watchdog', mode);
    } catch (err) {
      // runDirect logs the cause; this says the rescue attempt failed too,
      // which is the more urgent signal of the two.
      this.logger.error(
        `ig-media: watchdog sync also failed for ${connectionId}: ${(err as Error)?.message}`,
      );
    }
  }
}
