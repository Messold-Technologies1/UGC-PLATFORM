import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Queue, Worker } from 'bullmq';
import { buildBullmqConnection } from './bullmq-redis.connection';
import {
  CreatorReminderService,
  REMINDER_STAGES,
  STAGE_DELAY_MS,
  type ReminderStage,
} from './creator-reminder.service';

const QUEUE_NAME = 'creator-completion-reminder';
const JOB_NAME = 'reminder-stage';

interface ReminderJobData {
  profileId: string;
  stage: ReminderStage;
}

/**
 * Event-driven "finish your profile" reminders — the drip-campaign model used
 * by Mailchimp/Braze/Customer.io, not a polling loop.
 *
 * At signup we schedule one delayed BullMQ job per stage (30 min / 24 h / 48 h).
 * Each job re-checks exit conditions at fire time and sends via
 * CreatorReminderService, so the database is touched only when a reminder is
 * actually due — nothing polls on a fixed interval, which lets the Neon compute
 * endpoint autosuspend between signups.
 *
 * The delayed jobs live in Redis, so a low-frequency DB-truth sweep
 * ({@link runBackstop}) backstops the cases Redis can't cover (a Redis
 * restart/eviction dropping a scheduled job, or the feature being enabled after
 * signups already exist). It runs infrequently enough to keep Neon asleep.
 */
@Injectable()
export class CreatorReminderQueueService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CreatorReminderQueueService.name);
  private readonly redisUrl: string | undefined;
  private queue: Queue<ReminderJobData> | null = null;
  private worker: Worker<ReminderJobData> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly reminders: CreatorReminderService,
  ) {
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  async onModuleInit(): Promise<void> {
    if (!this.reminders.isEnabled()) {
      this.logger.log('creator completion reminders disabled');
      return;
    }
    if (!this.redisUrl) {
      // No Redis: the delayed-job path is unavailable, but the DB-truth backstop
      // cron below still delivers reminders (just at the sweep cadence).
      this.logger.warn(
        'creator reminders: REDIS_URL not set — delayed jobs disabled, backstop sweep only',
      );
      return;
    }

    const connection = buildBullmqConnection(this.redisUrl);
    this.queue = new Queue<ReminderJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    });
    // The other queues all wait here. Without it onModuleInit resolves before
    // Redis is actually usable, so the first enqueue can race the connection.
    await this.queue.waitUntilReady();

    const workerEnabled =
      this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') !== 'false';
    if (!workerEnabled) {
      this.logger.warn(
        'creator reminders: BULLMQ_WORKER_ENABLED=false — queue only (no worker on this process)',
      );
      return;
    }

    this.worker = new Worker<ReminderJobData>(
      QUEUE_NAME,
      async (job) => {
        await this.reminders.deliverStage(job.data.profileId, job.data.stage);
      },
      { connection, concurrency: 5 },
    );
    this.worker.on('failed', (job, err) => {
      this.logger.warn(
        `creator reminder job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
      );
    });
    this.worker.on('error', (err) => {
      this.logger.error(`creator reminders: worker error: ${err?.message}`);
    });
    this.worker.on('ioredis:close', () => {
      this.logger.warn(
        'creator reminders: worker Redis connection closed — jobs may sit in `wait` until it recovers',
      );
    });

    await this.worker.waitUntilReady();
    this.logger.log('creator reminders: delayed-job queue + worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }

  /**
   * Schedule the full reminder sequence for a freshly-created creator profile.
   * Call AFTER the signup transaction commits. Never throws — a scheduling
   * failure is covered by the backstop sweep. No-op when disabled or Redis-less.
   */
  async scheduleReminders(profileId: string): Promise<void> {
    if (!this.queue || !this.reminders.isEnabled()) return;
    for (const stage of REMINDER_STAGES) {
      try {
        await this.queue.add(
          JOB_NAME,
          { profileId, stage },
          {
            jobId: `crm-${profileId}-${stage}`,
            delay: STAGE_DELAY_MS[stage],
          },
        );
      } catch (err) {
        this.logger.warn(
          `creator reminders: could not schedule stage ${stage} for ${profileId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }

  /**
   * DB-truth backstop. Runs every 6 hours — sparse enough that Neon can
   * autosuspend between runs, while still catching any reminder the delayed
   * jobs missed. Single-flight so overlapping runs never stack.
   */
  @Cron('0 0 */6 * * *')
  async runBackstop(): Promise<void> {
    if (!this.reminders.isEnabled() || this.backstopRunning) return;
    this.backstopRunning = true;
    try {
      await this.reminders.runBackstopSweep();
    } catch (err) {
      this.logger.warn(
        `creator_reminder backstop failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    } finally {
      this.backstopRunning = false;
    }
  }

  private backstopRunning = false;
}
