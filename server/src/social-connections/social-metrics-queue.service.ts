import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { buildBullmqConnection } from '../jobs/bullmq-redis.connection';
import { shouldRunInline } from '../jobs/bullmq-watchdog.util';
import { withTimeout } from '../util/with-timeout';
import { SocialConnectionsService } from './social-connections.service';

const QUEUE_NAME = 'social-metrics-sync';
const JOB_NAME = 'sync-connection';
/**
 * If a queued job is still sitting in `wait` after this, run the sync directly.
 * The in-process BullMQ worker on managed Redis can fail to consume jobs (they
 * stay in `wait` and never go `active`); the watermark queue works around the
 * same behaviour with an identical watchdog.
 */
const WATCHDOG_MS = 15_000;
/**
 * Upper bound for one sync. Individual Graph calls already time out, so this
 * only guards against an unexpected stall (e.g. a hung DB write) parking the
 * job in `active` until BullMQ's lock expires.
 */
const SYNC_TIMEOUT_MS = 90_000;
/**
 * Cap for the watchdog's own Redis lookups. The connection is built with
 * `maxRetriesPerRequest: null` (required by BullMQ), which makes ioredis retry
 * a command forever instead of rejecting it — so if Redis is unreachable,
 * `getJob()` never settles and `.catch()` never runs, leaving the watchdog
 * silently dead. Time the lookups out and sync anyway.
 */
const LOOKUP_TIMEOUT_MS = 5_000;

interface SyncJobData {
  connectionId: string;
}

/**
 * BullMQ queue + in-process worker for social metric syncs — the same shape as
 * WatermarkQueueService. In production (REDIS_URL set) the daily cron enqueues
 * one job per connection and this worker fetches from the platform APIs off the
 * request path. Without REDIS_URL (local dev) syncs run inline.
 *
 * The heavy lifting lives in SocialConnectionsService.syncConnection(); this
 * service only handles queueing/concurrency so there is no dependency cycle.
 */
@Injectable()
export class SocialMetricsQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SocialMetricsQueueService.name);
  private readonly redisUrl: string | undefined;
  private queue: Queue<SyncJobData> | null = null;
  private worker: Worker<SyncJobData> | null = null;
  private readonly processing = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly service: SocialConnectionsService,
  ) {
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  async onModuleInit(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'social-metrics: REDIS_URL not set — running syncs inline (no queue)',
      );
      return;
    }

    const connection = buildBullmqConnection(this.redisUrl);
    this.queue = new Queue<SyncJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
    await this.queue.waitUntilReady();

    // Every replica may enqueue; only processes with BULLMQ_WORKER_ENABLED
    // (default true) open a blocking consumer. On a multi-replica API, set
    // BULLMQ_WORKER_ENABLED=false on all but one replica (or scale to 1) so
    // a single live worker owns the queue — otherwise a stale BZPOPMIN can
    // move jobs to `active` with no Nest handler running.
    const workerEnabled =
      this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') !== 'false';
    if (!workerEnabled) {
      this.logger.warn(
        'social-metrics: BULLMQ_WORKER_ENABLED=false — queue only (no worker on this process)',
      );
      return;
    }

    const concurrency = Math.max(
      1,
      Number(this.config.get('SOCIAL_METRICS_CONCURRENCY', 3)),
    );
    this.worker = new Worker<SyncJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.processConnectionDirect(job.data.connectionId, 'worker');
      },
      {
        connection,
        concurrency,
        // Keep locks short so a zombie claim is marked stalled and retried
        // instead of parking the job in `active` until a 2-minute lock expires.
        // Must outlast SYNC_TIMEOUT_MS, or a sync still running at 60s loses
        // its lock and is reclaimed as stalled while it is mid-flight.
        lockDuration: SYNC_TIMEOUT_MS + 30_000,
        stalledInterval: 15_000,
        maxStalledCount: 3,
      },
    );

    this.worker.on('ready', () => {
      this.logger.log('social-metrics: worker ready (listening for jobs)');
    });
    this.worker.on('active', (job) => {
      this.logger.log(`social-metrics: job active ${job.id}`);
    });
    this.worker.on('completed', (job) => {
      this.logger.log(`social-metrics job ${job.id} completed`);
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `social-metrics job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('stalled', (jobId) => {
      this.logger.warn(`social-metrics: job stalled ${jobId}`);
    });
    this.worker.on('error', (err) => {
      this.logger.error(`social-metrics worker error: ${err?.message}`);
    });
    // Diagnostic: the worker waits for jobs on a blocking Redis connection.
    // On managed Redis that connection can be dropped during idle periods, and
    // until it re-establishes, newly enqueued jobs sit in `wait` and never go
    // `active` (the watchdog then runs them inline). Logging the close lets us
    // correlate a drop with a subsequent watchdog fire and confirm the cause.
    this.worker.on('ioredis:close', () => {
      this.logger.warn(
        'social-metrics: worker Redis connection closed — reconnecting; jobs may sit in `wait` until it recovers',
      );
    });

    await this.worker.waitUntilReady();

    const workers = await this.queue.getWorkers().catch(() => []);
    this.logger.log(
      `social-metrics: BullMQ queue + worker started (${workers.length} worker(s) registered in Redis)`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /** Queue a sync for one connection (or run inline when no Redis). Never throws. */
  async enqueue(connectionId: string): Promise<void> {
    if (this.queue) {
      try {
        const jobId = `sync-${connectionId}`;
        // The fixed jobId de-dupes *concurrent* syncs for a connection, but
        // BullMQ also refuses to re-add a jobId that still exists in a
        // completed/failed state (we retain history). Since a connection's id is
        // reused across reconnects, a leftover finished job would silently block
        // every future sync. Drop a finished leftover before re-queuing; if one
        // is still pending/active, it's already going to run.
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          const state = await existing.getState();
          if (state === 'completed' || state === 'failed') {
            await existing.remove().catch(() => undefined);
          } else if (state === 'active' && !this.processing.has(connectionId)) {
            // Orphaned lock: a stale consumer claimed the job but no live
            // handler is running it on this process. Don't bail — sync inline
            // now; BullMQ will stall-retry/clear the lock separately.
            this.logger.warn(
              `social-metrics: orphaned active job ${jobId} — syncing inline`,
            );
            void this.runInlineGuarded(connectionId, 'orphan-active');
            return;
          } else {
            this.logger.log(
              `social-metrics: sync already queued for ${connectionId} (${state})`,
            );
            return;
          }
        }
        await this.queue.add(JOB_NAME, { connectionId }, { jobId });

        const counts = await this.queue
          .getJobCounts('wait', 'active', 'delayed', 'failed')
          .catch(() => null);
        this.logger.log(
          `social-metrics: queued sync for ${connectionId} (jobId=${jobId})${
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
          void this.watchdog(connectionId, jobId);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `social-metrics: enqueue failed for ${connectionId}: ${(err as Error)?.message} (inline fallback)`,
        );
      }
    }
    void this.runInlineGuarded(connectionId, 'inline');
  }

  /** Run a sync outside the request path. De-duplicates concurrent runs. */
  async processConnectionDirect(
    connectionId: string,
    source: string,
  ): Promise<void> {
    // The BullMQ worker is the authoritative sync path: it must NEVER be
    // silently skipped, or the job completes having made zero Instagram calls
    // and lastSyncedAt stays null (job active, no API calls, no data). Only the
    // best-effort callers (watchdog / inline fallback) defer to an in-flight
    // run. syncConnection is idempotent, so a rare concurrent run just repeats
    // one fetch — far better than dropping the sync entirely.
    if (source !== 'worker' && this.processing.has(connectionId)) {
      this.logger.log(
        `social-metrics: ${source} skipped ${connectionId} — a sync is already in progress for it`,
      );
      return;
    }
    this.processing.add(connectionId);
    const startedAt = Date.now();
    try {
      this.logger.log(`social-metrics: ${source} syncing ${connectionId}`);
      await withTimeout(
        this.service.syncConnection(connectionId),
        SYNC_TIMEOUT_MS,
        `social-metrics ${source} sync ${connectionId}`,
      );
      this.logger.log(
        `social-metrics: ${source} synced ${connectionId} in ${Date.now() - startedAt}ms`,
      );
    } catch (err) {
      this.logger.error(
        `social-metrics: ${source} sync failed for ${connectionId} after ${Date.now() - startedAt}ms: ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(connectionId);
    }
  }

  /**
   * processConnectionDirect for the fire-and-forget callers. It rethrows so the
   * worker can retry, but a `void` call has nowhere to put that — and Node
   * treats an unhandled rejection as fatal. The failure is already logged.
   */
  private async runInlineGuarded(
    connectionId: string,
    source: string,
  ): Promise<void> {
    await this.processConnectionDirect(connectionId, source).catch(
      () => undefined,
    );
  }

  /**
   * If the enqueued job is still unconsumed (or claimed into `active` with no
   * live handler on this process) after WATCHDOG_MS, run the sync directly.
   *
   * Important: do NOT treat `active` as healthy. A zombie/stale BZPOPMIN can
   * move the job to `active` without any Nest worker handler running — that is
   * exactly the "active=1 but no job active / worker syncing logs" failure.
   * Only skip when this process is already running the sync itself.
   */
  private async watchdog(connectionId: string, jobId: string): Promise<void> {
    if (!this.queue) return;

    // Bound these lookups (see LOOKUP_TIMEOUT_MS): under maxRetriesPerRequest:
    // null an unreachable Redis makes getJob()/getState() hang forever, which
    // would strand the watchdog here and never run the inline sync. On timeout
    // assume the job is unconsumed and proceed — the inline sync only needs
    // Postgres, so it works even while Redis is down.
    const job = await withTimeout(
      this.queue.getJob(jobId),
      LOOKUP_TIMEOUT_MS,
      'watchdog getJob',
    ).catch(() => null);
    const state = job
      ? await withTimeout(
          job.getState(),
          LOOKUP_TIMEOUT_MS,
          'watchdog getState',
        ).catch(() => 'unknown')
      : 'missing';
    if (
      !shouldRunInline({
        state,
        runningLocally: this.processing.has(connectionId),
        hasLocalWorker: this.worker != null,
      })
    ) {
      return;
    }

    this.logger.warn(
      `social-metrics: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — syncing directly`,
    );
    // Fire-and-forget: its getWorkers() call can hang the same way and must not
    // delay the inline sync.
    void this.logWorkerDiagnostics();
    try {
      await this.processConnectionDirect(connectionId, 'watchdog');
    } catch (err) {
      // processConnectionDirect logs the cause; this says the rescue attempt
      // failed too, which is the more urgent of the two signals.
      this.logger.error(
        `social-metrics: watchdog sync also failed for ${connectionId}: ${(err as Error)?.message}`,
      );
    } finally {
      // Clear a parked wait/delayed leftover under the fixed jobId. For an
      // orphaned `active` lock we can't remove until the lock expires — BullMQ's
      // stalled checker (stalledInterval) will reclaim it; the next enqueue
      // also sweeps completed/failed leftovers.
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
    const job = await withTimeout(
      this.queue.getJob(jobId),
      LOOKUP_TIMEOUT_MS,
      'removeParkedJob getJob',
    ).catch(() => null);
    if (!job) return;
    const state = await withTimeout(
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
    const workers = await withTimeout(
      this.queue.getWorkers(),
      LOOKUP_TIMEOUT_MS,
      'getWorkers',
    ).catch(() => []);
    this.logger.warn(
      `social-metrics: diagnostics workersRegistered=${workers.length} isRunning=${this.worker.isRunning()} isPaused=${this.worker.isPaused()}`,
    );
  }
}
