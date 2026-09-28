import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandAccessService } from '../../brand-access/brand-access.service';
import { frontendBaseUrl } from '../../util/frontend-url.util';
import type { EventContext, PopulationSpec } from '../catalog/define-events';
import { NotificationQueueService } from '../queues/notification-queue.service';
import type { StepJobData } from '../queues/notification-queues';

const PAGE_SIZE = 500;

/**
 * Reaches the entities an event can never be emitted for.
 *
 * Every other event has a moment: an order is delivered, a brief is accepted,
 * and `emit()` is called there. "Your profile is still incomplete" has no such
 * moment — nothing happens, a profile simply sits unfinished.
 *
 * Signup is the one moment available, so a new signup is emitted there and its
 * drip runs from delayed jobs. That leaves the creators who signed up *before*
 * any of this existed: nobody emitted for them, so they would never hear from
 * it at all. This is how they are reached.
 *
 * It is therefore a backfill, not a recurring process — after the backlog is
 * cleared there is little left for it to find, since every new signup emits.
 * So it runs when an admin presses the button, with the count shown first,
 * rather than on a cron that could put the largest send this platform has done
 * through the door at 10am unannounced.
 */
@Injectable()
export class NotificationSweepService {
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
  ) {}

  /**
   * Count what a sweep would send, touching nothing. This is what the admin
   * sees before deciding.
   */
  async preview(
    eventKey: string,
    population: PopulationSpec,
  ): Promise<{ scanned: number; wouldSend: number }> {
    const result = await this.walk(eventKey, population, { dryRun: true });
    return { scanned: result.scanned, wouldSend: result.enqueued };
  }

  /** Runs one event's sweep. Exposed so it can be triggered and tested directly. */
  async sweep(
    eventKey: string,
    population: PopulationSpec,
  ): Promise<{ scanned: number; enqueued: number; superseded: number }> {
    return this.walk(eventKey, population, { dryRun: false });
  }

  private async walk(
    eventKey: string,
    population: PopulationSpec,
    opts: { dryRun: boolean },
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
            if (!opts.dryRun) {
              await this.queues.enqueueStep(
                this.job(eventKey, entity, row),
                // The bulk lane, never the transactional one: a large sweep
                // must not hold an order confirmation behind its rate limiter.
                'bulk',
              );
            }
            enqueued += 1;
          }

          // Mark the rows this profile has aged past, so they are never
          // revisited and the log says why they were not sent.
          if (!opts.dryRun) {
            for (const row of skipped) {
              superseded += await this.markSuperseded(eventKey, entity.id, row);
            }
          }
        }

        cursor = page[page.length - 1].id;
      }

      this.logger.log(
        `sweep ${eventKey}${opts.dryRun ? ' (preview)' : ''}: scanned ${scanned}, ` +
          `${opts.dryRun ? 'would send' : 'enqueued'} ${enqueued}, superseded ${superseded}`,
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
