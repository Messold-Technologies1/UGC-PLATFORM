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
import { InstagramMirrorService } from './instagram-mirror.service';

const QUEUE_NAME = 'instagram-media-mirror';
const JOB_NAME = 'mirror-reel';
/** One reel can be large on a slow link; the service caps its own fetch too. */
const MIRROR_TIMEOUT_MS = 300_000;
const WATCHDOG_MS = 20_000;
const LOOKUP_TIMEOUT_MS = 5_000;

interface MirrorJobData {
  videoId: string;
}

/**
 * Queue for copying imported reels into S3.
 *
 * Deliberately separate from the reel-cache sync queue: a mirror streams a
 * whole video and can take minutes, and putting it on the same queue would let
 * one slow download block metadata for every other creator. Concurrency is kept
 * low for the same reason — each job holds a live HTTP stream.
 */
@Injectable()
export class InstagramMirrorQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(InstagramMirrorQueueService.name);
  private readonly redisUrl: string | undefined;
  private queue: Queue<MirrorJobData> | null = null;
  private worker: Worker<MirrorJobData> | null = null;
  private readonly processing = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly mirror: InstagramMirrorService,
  ) {
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  async onModuleInit(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'ig-mirror: REDIS_URL not set — mirroring inline (no queue)',
      );
      return;
    }

    const connection = buildBullmqConnection(this.redisUrl);
    this.queue = new Queue<MirrorJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 20_000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });
    await this.queue.waitUntilReady();

    if (this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') === 'false') {
      this.logger.warn(
        'ig-mirror: BULLMQ_WORKER_ENABLED=false — queue only (no worker here)',
      );
      return;
    }

    const concurrency = Math.max(
      1,
      Number(this.config.get('IG_MIRROR_CONCURRENCY', 2)),
    );
    this.worker = new Worker<MirrorJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.runDirect(job.data.videoId, 'worker');
      },
      {
        connection,
        concurrency,
        // Long enough for a large reel, so a slow download is not mistaken for
        // a zombie claim and reclaimed mid-stream.
        lockDuration: 360_000,
        stalledInterval: 60_000,
        maxStalledCount: 2,
      },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `ig-mirror: job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
      // Out of attempts: close the loop, or the row stays PROCESSING for good.
      const attempts = job?.opts?.attempts ?? 1;
      if (job && (job.attemptsMade ?? 0) >= attempts) {
        void this.mirror
          .failAfterRetries(job.data.videoId, err?.message ?? 'unknown error')
          .catch((e: unknown) =>
            this.logger.error(
              `ig-mirror: could not park ${job.data.videoId} as failed: ${(e as Error)?.message}`,
            ),
          );
      }
    });
    this.worker.on('error', (err) => {
      this.logger.error(`ig-mirror worker error: ${err?.message}`);
    });
    this.worker.on('ioredis:close', () => {
      // The other queues warn about this; without it a dropped blocking
      // connection here is invisible and mirrors silently stop being consumed.
      this.logger.warn(
        'ig-mirror: worker Redis connection closed — jobs may sit in `wait` until it recovers',
      );
    });

    await this.worker.waitUntilReady();
    this.logger.log(
      `ig-mirror: queue + worker ready (concurrency=${concurrency})`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /** Queue mirrors for a batch of freshly imported videos. Never throws. */
  async enqueueMany(videoIds: string[]): Promise<void> {
    await Promise.all(videoIds.map((id) => this.enqueue(id)));
  }

  async enqueue(videoId: string): Promise<void> {
    if (this.queue) {
      try {
        const jobId = `igmirror-${videoId}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          const state = await existing.getState();
          if (state === 'completed' || state === 'failed') {
            // A retained finished job would block this id forever, which
            // matters here because retry is a user-facing action.
            await existing.remove().catch(() => undefined);
          } else {
            return; // already pending or running
          }
        }
        await this.queue.add(JOB_NAME, { videoId }, { jobId });
        setTimeout(() => {
          void this.watchdog(videoId, jobId);
        }, WATCHDOG_MS);
        return;
      } catch (err) {
        this.logger.error(
          `ig-mirror: enqueue failed for ${videoId}: ${(err as Error)?.message} (inline fallback)`,
        );
      }
    }
    void this.runInlineGuarded(videoId, 'inline');
  }

  async runDirect(videoId: string, source: string): Promise<void> {
    if (source !== 'worker' && this.processing.has(videoId)) return;
    this.processing.add(videoId);
    const startedAt = Date.now();
    try {
      await withTimeout(
        this.mirror.mirrorVideo(videoId),
        MIRROR_TIMEOUT_MS,
        `ig-mirror ${source} ${videoId}`,
      );
    } catch (err) {
      // This path had no catch at all, so a failed mirror outside the worker
      // produced no log line anywhere.
      this.logger.error(
        `ig-mirror: ${source} mirror failed for ${videoId} after ${Date.now() - startedAt}ms: ${(err as Error)?.message}`,
      );
      throw err;
    } finally {
      this.processing.delete(videoId);
    }
  }

  /**
   * runDirect for the fire-and-forget callers.
   *
   * Two jobs: keep a `void` call from becoming a fatal unhandled rejection, and
   * park the row as FAILED — there is no BullMQ retry budget on this path, so
   * this failure is already terminal and PROCESSING would otherwise be
   * permanent.
   */
  private async runInlineGuarded(
    videoId: string,
    source: string,
  ): Promise<void> {
    try {
      await this.runDirect(videoId, source);
    } catch (err) {
      await this.mirror
        .failAfterRetries(videoId, (err as Error)?.message ?? 'unknown error')
        .catch(() => undefined);
    }
  }

  private async watchdog(videoId: string, jobId: string): Promise<void> {
    if (!this.queue) return;
    const job = await withTimeout(
      this.queue.getJob(jobId),
      LOOKUP_TIMEOUT_MS,
      'ig-mirror watchdog getJob',
    ).catch(() => null);
    const state = job
      ? await withTimeout(
          job.getState(),
          LOOKUP_TIMEOUT_MS,
          'ig-mirror watchdog getState',
        ).catch(() => 'unknown')
      : 'missing';
    if (
      !shouldRunInline({
        state,
        runningLocally: this.processing.has(videoId),
        hasLocalWorker: this.worker != null,
      })
    ) {
      return;
    }

    this.logger.warn(
      `ig-mirror: watchdog job ${jobId} still ${state} after ${WATCHDOG_MS}ms — mirroring directly`,
    );
    // Guarded rather than swallowed: the row is parked as FAILED so the picker
    // stops promising a video that is never coming.
    await this.runInlineGuarded(videoId, 'watchdog');
  }
}
