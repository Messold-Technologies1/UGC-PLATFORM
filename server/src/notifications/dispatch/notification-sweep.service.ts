import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandAccessService } from '../../brand-access/brand-access.service';
import { frontendBaseUrl } from '../../util/frontend-url.util';
import { NOTIFICATION_EVENTS_BY_KEY } from '../catalog/event-catalog';
import type { EventContext, PopulationSpec } from '../catalog/define-events';
import { NotificationQueueService } from '../queues/notification-queue.service';
import type { StepJobData } from '../queues/notification-queues';

const PAGE_SIZE = 500;

/**
 * Drives the events that are swept rather than emitted.
 *
 * The completion reminder is the case this exists for. Nothing *happens* to
 * make a profile incomplete, so there is no moment to emit from — and the
 * legacy job only ever reached creators inside a ~10 day window, leaving older
 * building profiles to hear nothing. This sweeps all of them, every day, with
 * no window at all.
 */
@Injectable()
export class NotificationSweepService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSweepService.name);
  /**
   * Guards against a slow sweep starting again before it has finished. Two
   * replicas could still overlap, which is harmless: the log's unique
   * constraint means the second claim simply loses.
   */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly brandAccess: BrandAccessService,
    private readonly queues: NotificationQueueService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    // Only a process that runs workers should sweep, so an API-only replica
    // never produces bulk jobs. Registering here rather than from the queue
    // service keeps the dependency one-way — the queue service must not also
    // depend on this one.
    if (this.config.get<string>('BULLMQ_WORKER_ENABLED', 'true') === 'false') {
      this.logger.log('sweeps disabled on this process (no worker)');
      return;
    }
    this.registerCrons();
  }

  /** Registers a cron per swept event. */
  registerCrons(): void {
    for (const [eventKey, definition] of Object.entries(
      NOTIFICATION_EVENTS_BY_KEY,
    )) {
      const population = definition.population;
      if (!population) continue;

      const name = `notification-sweep:${eventKey}`;
      if (this.scheduler.doesExist('cron', name)) continue;

      const job = new CronJob(population.cron, () => {
        void this.sweep(eventKey, population);
      });
      this.scheduler.addCronJob(name, job as never);
      job.start();
      this.logger.log(`sweep registered for ${eventKey} (${population.cron})`);
    }
  }

  /** Runs one event's sweep. Exposed so it can be triggered and tested directly. */
  async sweep(
    eventKey: string,
    population: PopulationSpec,
  ): Promise<{ scanned: number; enqueued: number; superseded: number }> {
    if (this.running.has(eventKey)) {
      this.logger.warn(`sweep ${eventKey}: previous run still going, skipping`);
      return { scanned: 0, enqueued: 0, superseded: 0 };
    }
    this.running.add(eventKey);

    try {
      const rows = await this.activeSchedule(eventKey);
      if (rows.length === 0) return { scanned: 0, enqueued: 0, superseded: 0 };

      const ctx = this.context();
      let cursor: string | null = null;
      let scanned = 0;
      let enqueued = 0;
      let superseded = 0;

      for (;;) {
        const page = await population.page(ctx, cursor, PAGE_SIZE);
        if (page.length === 0) break;
        scanned += page.length;

        for (const entity of page) {
          const due = rows.filter(
            (row) =>
              entity.clockAt.getTime() + row.offsetMinutes * 60_000 <=
              Date.now(),
          );
          if (due.length === 0) continue;

          const toSend = population.highestDueOnly ? due.slice(-1) : due;
          const skipped = population.highestDueOnly ? due.slice(0, -1) : [];

          for (const row of toSend) {
            await this.queues.enqueueStep(
              this.job(eventKey, entity, row),
              // The bulk lane, never the transactional one: a large sweep must
              // not hold an order confirmation behind its rate limiter.
              'bulk',
            );
            enqueued += 1;
          }

          // Mark the rows this profile has aged past, so they are never
          // revisited and the log says why they were not sent.
          for (const row of skipped) {
            superseded += await this.markSuperseded(eventKey, entity.id, row);
          }
        }

        cursor = page[page.length - 1].id;
      }

      this.logger.log(
        `sweep ${eventKey}: scanned ${scanned}, enqueued ${enqueued}, superseded ${superseded}`,
      );
      return { scanned, enqueued, superseded };
    } finally {
      this.running.delete(eventKey);
    }
  }

  private async activeSchedule(eventKey: string) {
    const event = await this.prisma.notificationEvent.findUnique({
      where: { key: eventKey },
      select: {
        isActive: true,
        deprecated: true,
        schedule: {
          where: { isActive: true },
          orderBy: { offsetMinutes: 'asc' },
          select: { offsetMinutes: true, channels: true },
        },
      },
    });
    if (!event || event.deprecated || !event.isActive) return [];
    return event.schedule.filter((row) => row.channels.length > 0);
  }

  private job(
    eventKey: string,
    entity: { id: string; clockAt: Date },
    row: { offsetMinutes: number; channels: NotificationChannel[] },
  ): StepJobData {
    return {
      eventKey,
      entityId: entity.id,
      // One drip per entity, so the entity identifies the occurrence.
      occurrenceKey: entity.id,
      occurredAt: entity.clockAt.toISOString(),
      offsetMinutes: row.offsetMinutes,
      channels: row.channels,
    };
  }

  private async markSuperseded(
    eventKey: string,
    entityId: string,
    row: { offsetMinutes: number; channels: NotificationChannel[] },
  ): Promise<number> {
    const { count } = await this.prisma.notificationLog.createMany({
      data: row.channels.map((channel) => ({
        eventKey,
        entityId,
        occurrenceKey: entityId,
        offsetMinutes: row.offsetMinutes,
        channel,
        recipientUserId: null,
        toAddress: '',
        status: NotificationLogStatus.SKIPPED,
        skippedReason: 'superseded',
        claimedAt: new Date(),
      })),
      // Already sent or already superseded — either way, nothing to do.
      skipDuplicates: true,
    });
    return count;
  }

  private context(): EventContext {
    return {
      prisma: this.prisma,
      config: this.config,
      brandAccess: this.brandAccess,
      frontendBaseUrl: frontendBaseUrl(this.config),
    };
  }
}
