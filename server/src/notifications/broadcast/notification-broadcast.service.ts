import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  BroadcastAudience,
  BroadcastStatus,
  NotificationChannel,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationQueueService } from '../queues/notification-queue.service';
import type { StepJobData } from '../queues/notification-queues';
import { BROADCAST_AUDIENCES } from './broadcast-audiences';

/** One page of profile ids per round trip. */
const PAGE = 500;

@Injectable()
export class NotificationBroadcastService {
  private readonly logger = new Logger(NotificationBroadcastService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: NotificationQueueService,
  ) {}

  /** What each audience is and how many it currently matches. */
  async listAudiences() {
    const entries = Object.entries(BROADCAST_AUDIENCES) as Array<
      [BroadcastAudience, (typeof BROADCAST_AUDIENCES)[BroadcastAudience]]
    >;
    return Promise.all(
      entries.map(async ([audience, def]) => {
        const [size, event] = await Promise.all([
          def.count(this.prisma),
          this.prisma.notificationEvent.findUnique({
            where: { key: def.eventKey },
            select: { isActive: true },
          }),
        ]);
        return {
          audience,
          eventKey: def.eventKey,
          label: def.label,
          description: def.description,
          size,
          // An event switched off in the Events list cannot send. Surfaced
          // here so the UI can say so up front, rather than the admin pressing
          // Send and getting a refusal.
          isActive: event?.isActive ?? false,
        };
      }),
    );
  }

  /**
   * How many this would reach, without writing anything.
   *
   * The count is of the audience, not of messages that will arrive: opt-outs,
   * suppressed addresses and missing phone numbers are decided per recipient at
   * send time and recorded in the delivery log. Saying so in the UI matters —
   * an admin who reads this as "emails delivered" will think the send failed.
   */
  async preview(audience: BroadcastAudience): Promise<{ size: number }> {
    return { size: await this.audienceDef(audience).count(this.prisma) };
  }

  async list(take = 30) {
    return this.prisma.notificationBroadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
      include: { emailTemplate: { select: { id: true, name: true } } },
    });
  }

  /**
   * Create the run, then walk the audience onto the bulk lane.
   *
   * The row is written before the walk so that a crash mid-send leaves a record
   * saying how far it got, rather than nothing at all. `enqueued` is updated as
   * pages complete for the same reason.
   */
  async send(input: {
    audience: BroadcastAudience;
    channels: NotificationChannel[];
    emailTemplateId?: string | null;
    whatsappTemplateName?: string | null;
    note?: string | null;
    createdByUserId?: string | null;
  }) {
    const def = this.audienceDef(input.audience);

    // Every job would reach the step worker, find the event switched off and
    // record `event_inactive`. That is thousands of skip rows and an admin
    // told "queued 1,284" while nothing was sent, so refuse here instead.
    const event = await this.prisma.notificationEvent.findUnique({
      where: { key: def.eventKey },
      select: { isActive: true },
    });
    if (!event) {
      throw new NotFoundException(
        `${def.eventKey} is not in the event registry yet. Boot the API once so the catalog syncs, then try again.`,
      );
    }
    if (!event.isActive) {
      throw new UnprocessableEntityException(
        `${def.eventKey} is switched off. Turn it on in Notifications → Events before sending this broadcast.`,
      );
    }

    const matched = await def.count(this.prisma);

    const run = await this.prisma.notificationBroadcast.create({
      data: {
        audience: input.audience,
        channels: input.channels,
        emailTemplateId: input.emailTemplateId ?? null,
        whatsappTemplateName: input.whatsappTemplateName ?? null,
        note: input.note ?? null,
        createdByUserId: input.createdByUserId ?? null,
        status: BroadcastStatus.SENDING,
        matched,
        startedAt: new Date(),
      },
    });

    // The run's own id is the occurrence key. Everything else about a broadcast
    // repeats — same event, same entity, same offset — so without it the
    // delivery log's unique constraint would accept the first announcement and
    // silently refuse every one after it.
    const occurrenceKey = run.id;
    const occurredAt = run.startedAt ?? run.createdAt;

    let enqueued = 0;
    let cursor: string | null = null;

    try {
      for (;;) {
        const ids: string[] = await def.page(this.prisma, cursor, PAGE);
        if (ids.length === 0) break;

        for (const entityId of ids) {
          const job: StepJobData = {
            eventKey: def.eventKey,
            entityId,
            occurrenceKey,
            occurredAt: occurredAt.toISOString(),
            offsetMinutes: 0,
            channels: input.channels,
            templateOverrideId: input.emailTemplateId ?? null,
            whatsappTemplateOverride: input.whatsappTemplateName ?? null,
          };
          // The bulk lane, never the transactional one: a broadcast to every
          // listed creator must not hold an order confirmation behind its
          // rate limiter.
          await this.queues.enqueueStep(job, 'bulk');
          enqueued += 1;
        }

        cursor = ids[ids.length - 1];
        await this.prisma.notificationBroadcast.update({
          where: { id: run.id },
          data: { enqueued },
        });
      }

      const done = await this.prisma.notificationBroadcast.update({
        where: { id: run.id },
        data: {
          status: BroadcastStatus.COMPLETED,
          enqueued,
          finishedAt: new Date(),
        },
      });
      this.logger.log(
        `broadcast ${input.audience}: ${enqueued}/${matched} queued (run ${run.id})`,
      );
      return done;
    } catch (err) {
      // Whatever was already queued still sends; the row says how much.
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `broadcast ${input.audience} failed after ${enqueued}: ${message}`,
      );
      return this.prisma.notificationBroadcast.update({
        where: { id: run.id },
        data: {
          status: BroadcastStatus.FAILED,
          enqueued,
          error: message,
          finishedAt: new Date(),
        },
      });
    }
  }

  private audienceDef(audience: BroadcastAudience) {
    const def = BROADCAST_AUDIENCES[audience];
    if (!def) throw new NotFoundException(`Unknown audience ${audience}`);
    return def;
  }
}
