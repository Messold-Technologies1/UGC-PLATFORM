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

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `social-metrics job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(`social-metrics worker error: ${err?.message}`);
    });

    await this.queue.waitUntilReady();
    await this.worker.waitUntilReady();
    this.logger.log('social-metrics: BullMQ queue + worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /** Queue a sync for one connection (or run inline when no Redis). Never throws. */
  async enqueue(connectionId: string): Promise<void> {
    if (this.queue) {
      try {
        await this.queue.add(
          JOB_NAME,
          { connectionId },
          { jobId: `sync-${connectionId}` },
        );
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
}
