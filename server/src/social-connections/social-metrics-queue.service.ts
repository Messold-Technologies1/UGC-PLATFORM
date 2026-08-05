import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import { buildBullmqConnection } from '../jobs/bullmq-redis.connection';
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

    const concurrency = Number(
      this.config.get('SOCIAL_METRICS_CONCURRENCY', 3),
    );
    this.worker = new Worker<SyncJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.processConnectionDirect(job.data.connectionId, 'worker');
      },
      { connection, concurrency, lockDuration: 120_000 },
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

    await this.queue.waitUntilReady();
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
    void this.processConnectionDirect(connectionId, 'inline');
  }

  /** Run a sync outside the request path. De-duplicates concurrent runs. */
  async processConnectionDirect(
    connectionId: string,
    source: string,
  ): Promise<void> {
    if (this.processing.has(connectionId)) return;
    this.processing.add(connectionId);
    try {
      this.logger.log(`social-metrics: ${source} syncing ${connectionId}`);
      await this.service.syncConnection(connectionId);
    } catch (err) {
      this.logger.error(
        `social-metrics: ${source} sync failed for ${connectionId}: ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(connectionId);
    }
  }

  /**
   * If the enqueued job is still `wait`/`delayed` after WATCHDOG_MS, the
   * in-process worker didn't consume it — run the sync directly so metrics
   * still populate. The diagnostics reveal whether a worker is even
   * registered/running on this Redis.
   */
  private async watchdog(connectionId: string, jobId: string): Promise<void> {
    if (!this.queue) return;

    const job = await this.queue.getJob(jobId).catch(() => null);
    const state = job
      ? await job.getState().catch(() => 'unknown')
      : 'missing';
    if (state === 'completed' || state === 'active') return;

    this.logger.warn(
      `social-metrics: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — syncing directly`,
    );
    await this.logWorkerDiagnostics();
    try {
      await this.processConnectionDirect(connectionId, 'watchdog');
    } catch {
      // syncConnection records its own failures; nothing more to do here.
    } finally {
      // The worker never consumed this job (it was still `wait`/`delayed`).
      // Because the jobId is fixed (`sync-<connectionId>`), leaving it parked
      // would make every future enqueue short-circuit as "already queued" and
      // silently stop syncing this connection — and a worker that later
      // recovers would redundantly re-run a sync we just did inline. Clear it
      // now that the sync has run directly. The daily cron re-enqueues next
      // cycle, so no retry is lost.
      await this.removeParkedJob(jobId);
    }
  }

  /**
   * Remove a leftover job by id unless the worker has meanwhile picked it up.
   * Used by the watchdog to stop an unconsumed job lingering under the fixed
   * jobId. Never throws.
   */
  private async removeParkedJob(jobId: string): Promise<void> {
    if (!this.queue) return;
    const job = await this.queue.getJob(jobId).catch(() => null);
    if (!job) return;
    const state = await job.getState().catch(() => 'unknown');
    if (state === 'active' || state === 'completed') return;
    await job.remove().catch(() => undefined);
  }

  private async logWorkerDiagnostics(): Promise<void> {
    if (!this.queue || !this.worker) return;
    const workers = await this.queue.getWorkers().catch(() => []);
    this.logger.warn(
      `social-metrics: diagnostics workersRegistered=${workers.length} isRunning=${this.worker.isRunning()} isPaused=${this.worker.isPaused()}`,
    );
  }
}
