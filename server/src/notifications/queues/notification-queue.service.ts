import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, UnrecoverableError, Worker } from 'bullmq';
import { buildBullmqConnection } from '../../jobs/bullmq-redis.connection';
import { NotificationDispatchService } from '../dispatch/notification-dispatch.service';
import { NotificationLogService } from '../log/notification-log.service';
import {
  NotificationStepService,
  PermanentSendError,
} from '../dispatch/notification-step.service';
import {
  DEFAULT_JOB_OPTIONS,
  JOB,
  QUEUE,
  eventJobId,
  stepDelayMs,
  stepJobId,
  type EventJobData,
  type StepJobData,
} from './notification-queues';

/**
 * BullMQ wiring for the notification pipeline.
 *
 * Deliberately thin: scheduling and delivery decisions live in
 * NotificationDispatchService and NotificationStepService, which is what lets
 * them be tested without Redis.
 *
 * Three queues, because a BullMQ rate limiter is per queue — see
 * notification-queues.ts. `notif-step` carries transactional sends and runs
 * unlimited; `notif-bulk` carries the population sweep and is capped, so a
 * large sweep can never hold an order confirmation behind it.
 */
@Injectable()
export class NotificationQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly redisUrl: string | undefined;

  private eventQueue: Queue<EventJobData> | null = null;
  private stepQueue: Queue<StepJobData> | null = null;
  private bulkQueue: Queue<StepJobData> | null = null;
  private readonly workers: Worker[] = [];

  constructor(
    private readonly config: ConfigService,
    private readonly dispatch: NotificationDispatchService,
    private readonly step: NotificationStepService,
    private readonly log: NotificationLogService,
  ) {
    this.redisUrl = config.get<string>('REDIS_URL');
  }

  async onModuleInit(): Promise<void> {
    if (!this.redisUrl) {
      this.logger.warn(
        'notifications: REDIS_URL not set — events will not be queued',
      );
      return;
    }

    const connection = buildBullmqConnection(this.redisUrl);
    this.eventQueue = new Queue(QUEUE.event, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    this.stepQueue = new Queue(QUEUE.step, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    this.bulkQueue = new Queue(QUEUE.bulk, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    // Without this the first enqueue can race the connection coming up.
    await Promise.all([
      this.eventQueue.waitUntilReady(),
      this.stepQueue.waitUntilReady(),
      this.bulkQueue.waitUntilReady(),
    ]);

    if (this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') === 'false') {
      this.logger.warn(
        'notifications: BULLMQ_WORKER_ENABLED=false — queues only, no worker on this process',
      );
      return;
    }

    const stepWorkers = [
      new Worker<StepJobData>(
        QUEUE.step,
        async (job) => this.runStep(job.data),
        { connection, concurrency: 10 },
      ),
      new Worker<StepJobData>(
        QUEUE.bulk,
        async (job) => this.runStep(job.data),
        {
          connection,
          concurrency: 5,
          // Keeps a sweep inside the SES sending quota. Only this queue is
          // capped; transactional sends must never queue behind it.
          limiter: {
            max: Number(
              this.config.get('NOTIFICATIONS_BULK_PER_MINUTE') ?? 120,
            ),
            duration: 60_000,
          },
        },
      ),
    ];

    const eventWorker = new Worker<EventJobData>(
      QUEUE.event,
      async (job) => this.runDispatch(job.data),
      { connection, concurrency: 5 },
    );

    this.workers.push(eventWorker, ...stepWorkers);

    for (const worker of stepWorkers) {
      worker.on('failed', (job, err) => {
        // `finishedOn` is BullMQ's own "this job is done retrying", set both
        // when the attempts run out and when an UnrecoverableError stops it
        // early. Checking attemptsMade against attempts would miss the second
        // case, which is the one a bad template or a bad select produces.
        if (!job?.finishedOn) return;
        void this.recordStepCrash(job.id, job.data, err);
      });
    }

    // An event job that dies takes every send with it, and leaves even less
    // behind than a failed step: no step job is ever created, so not one row
    // is written and the event is invisible rather than merely failed.
    eventWorker.on('failed', (job, err) => {
      if (!job?.finishedOn) return;
      void this.recordDispatchCrash(job.id, job.data, err);
    });

    for (const worker of this.workers) {
      worker.on('failed', (job, err) => {
        this.logger.warn(
          `notification job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err?.message}`,
        );
      });
      worker.on('error', (err) => {
        this.logger.error(`notification worker error: ${err?.message}`);
      });
    }

    this.logger.log(
      `notification workers started (sending ${
        this.config.get<string>('NOTIFICATIONS_SENDING_ENABLED') === 'true'
          ? 'ENABLED'
          : 'in shadow mode'
      })`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
    await Promise.all(
      [this.eventQueue, this.stepQueue, this.bulkQueue]
        .filter((q): q is Queue => q !== null)
        .map((q) => q.close()),
    );
  }

  async enqueueEvent(data: EventJobData): Promise<void> {
    if (!this.eventQueue) {
      this.logger.warn(
        `notifications: dropping ${data.eventKey} — no queue (REDIS_URL unset)`,
      );
      return;
    }
    await this.eventQueue.add(JOB.eventEmitted, data, {
      jobId: eventJobId(data),
    });
  }

  /** Enqueue one step. `bulk` routes a sweep send away from transactional traffic. */
  async enqueueStep(
    data: StepJobData,
    lane: 'step' | 'bulk' = 'step',
  ): Promise<void> {
    const queue = lane === 'bulk' ? this.bulkQueue : this.stepQueue;
    if (!queue) return;
    await queue.add(JOB.stepDue, data, {
      jobId: stepJobId(data),
      delay: stepDelayMs(data.offsetMinutes, new Date(data.occurredAt)),
    });
  }

  private async recordStepCrash(
    jobId: string | undefined,
    data: StepJobData,
    err: Error,
  ): Promise<void> {
    try {
      await this.log.recordCrash(data, err);
    } catch (writeErr) {
      this.logger.error(
        `could not record the failure of ${jobId}: ${messageOf(writeErr)}`,
      );
    }
  }

  /**
   * Record the sends an event job died before it could even schedule.
   *
   * A failed step at least knows its own offset and channels. An event job
   * knows neither — fanning out is the thing it failed at — so there is
   * nothing in the job to build a row from. What it does know is the event
   * key, and the schedule says what that event was supposed to send.
   *
   * So plan() is run once more, purely to learn that shape. It is a read with
   * no side effects, and by this point BullMQ has given up, so nothing is
   * enqueued from here and no send can be started twice. If the schedule read
   * is itself what was broken it will fail again, and then there genuinely is
   * nothing to record — which is said plainly rather than guessed at.
   */
  private async recordDispatchCrash(
    jobId: string | undefined,
    data: EventJobData,
    err: Error,
  ): Promise<void> {
    let steps: StepJobData[];
    try {
      steps = await this.dispatch.plan(data);
    } catch (planErr) {
      this.logger.error(
        `${data.eventKey} for ${data.entityId} failed to dispatch (${messageOf(
          err,
        )}) and its schedule could not be read either, so nothing could be ` +
          `recorded: ${messageOf(planErr)}`,
      );
      return;
    }

    if (steps.length === 0) {
      // Inactive, deprecated, or no channels selected: there was no send to
      // lose, so an empty log is the honest answer.
      this.logger.warn(
        `${data.eventKey} for ${data.entityId} failed to dispatch but has no active schedule; nothing to record`,
      );
      return;
    }

    // A partial fan-out leaves some steps already enqueued; those claim their
    // own rows, and recordCrash writes nothing where a row already exists.
    for (const step of steps) {
      await this.recordStepCrash(jobId, step, err);
    }
  }

  private async runDispatch(data: EventJobData): Promise<void> {
    const steps = await this.dispatch.plan(data);
    for (const step of steps) {
      await this.enqueueStep(step);
    }
  }

  private async runStep(data: StepJobData): Promise<void> {
    try {
      await this.step.deliver(data);
    } catch (err) {
      // A permanent failure costs one attempt, not three — a wrong template
      // name should not burn three rate-limiter slots per recipient.
      if (err instanceof PermanentSendError) {
        throw new UnrecoverableError(err.message);
      }
      throw err;
    }
  }
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
