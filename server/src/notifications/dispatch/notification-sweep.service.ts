import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BrandAccessService } from '../../brand-access/brand-access.service';
import { frontendBaseUrl } from '../../util/frontend-url.util';
import type { EventContext, PopulationSpec } from '../catalog/define-events';
import { NotificationQueueService } from '../queues/notification-queue.service';

const PAGE_SIZE = 500;

/**
 * Enrols the entities an event can never be emitted for — the ones that existed
 * before the drip did.
 *
 * Every other event has a moment: an order is delivered, a brief is accepted, a
 * brand saves a creator, and `emit()` is called there. A population event has no
 * such moment for its backlog: a profile simply sits unfinished, a brand simply
 * never ordered. Signup/first-save emits for everyone from now on, so this only
 * has to reach the backlog that pre-dates the event.
 *
 * It **enrols forward**: each qualifying entity is scheduled the whole drip from
 * the moment the backfill runs (enrol time + each offset), exactly as if it had
 * just qualified — not caught up to the last stage of a drip it never received.
 * The per-entity occurrence key dedupes against the signup emit, so an entity
 * already mid-drip is skipped rather than double-sent.
 *
 * It is a backfill, not a recurring process — once the backlog is enrolled there
 * is little left to find, since every new entity emits for itself. So it runs
 * when an admin presses the button, with the count shown first, rather than on a
 * cron that could put the largest send this platform has done through the door
 * unannounced.
 */
@Injectable()
export class NotificationSweepService {
  private readonly logger = new Logger(NotificationSweepService.name);
  /**
   * Guards against a slow sweep starting again before it has finished. Two
   * replicas could still overlap, which is harmless: the queue's deterministic
   * job id means the second enrolment simply loses.
   */
  private readonly running = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly brandAccess: BrandAccessService,
    private readonly queues: NotificationQueueService,
  ) {}

  /**
   * Count how many entities a backfill would enrol, touching nothing. This is
   * what the admin sees before deciding.
   */
  async preview(
    eventKey: string,
    population: PopulationSpec,
  ): Promise<{ scanned: number; wouldSend: number }> {
    const result = await this.walk(eventKey, population, { dryRun: true });
    return { scanned: result.scanned, wouldSend: result.enqueued };
  }

  /** Runs one event's backfill. Exposed so it can be triggered and tested directly. */
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

      for (;;) {
        const page = await population.page(ctx, cursor, PAGE_SIZE);
        if (page.length === 0) break;
        scanned += page.length;

        for (const entity of page) {
          // Enrol from now: schedule every active row as a future-dated send
          // (now + offset), so an existing entity starts at stage one a few
          // days out — exactly like one that qualified today — rather than
          // being caught up to a stage it never received. The per-entity
          // occurrence key dedupes, so an entity already mid-drip (emitted at
          // signup) is skipped downstream rather than double-sent.
          if (!opts.dryRun) {
            const occurredAt = new Date().toISOString();
            for (const row of rows) {
              await this.queues.enqueueStep(
                {
                  eventKey,
                  entityId: entity.id,
                  occurrenceKey: entity.id,
                  occurredAt,
                  offsetMinutes: row.offsetMinutes,
                  channels: row.channels,
                },
                // The bulk lane, so a large enrolment stays inside the SES
                // quota as the delayed stages mature and never holds an order
                // confirmation behind its rate limiter.
                'bulk',
              );
            }
          }
          enqueued += 1; // one enrolment per entity, not per stage
        }

        cursor = page[page.length - 1].id;
      }

      this.logger.log(
        `sweep ${eventKey}${opts.dryRun ? ' (preview)' : ''}: scanned ${scanned}, ` +
          `${opts.dryRun ? 'would enrol' : 'enrolled'} ${enqueued}`,
      );
      return { scanned, enqueued, superseded: 0 };
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

  private context(): EventContext {
    return {
      prisma: this.prisma,
      config: this.config,
      brandAccess: this.brandAccess,
      frontendBaseUrl: frontendBaseUrl(this.config),
    };
  }
}
