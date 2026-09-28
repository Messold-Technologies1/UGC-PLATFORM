import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { getEventDefinition } from '../catalog/event-catalog';
import type { EventJobData, StepJobData } from '../queues/notification-queues';

/**
 * Fans one emitted event out across its configured schedule rows.
 *
 * Returns the step jobs to enqueue rather than enqueueing them, so the same
 * logic serves the queue worker and the backstop sweep, and can be asserted on
 * without Redis.
 */
@Injectable()
export class NotificationDispatchService {
  private readonly logger = new Logger(NotificationDispatchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async plan(job: EventJobData): Promise<StepJobData[]> {
    if (!getEventDefinition(job.eventKey)) {
      this.logger.warn(`emit for unknown event ${job.eventKey}; ignoring`);
      return [];
    }

    const event = await this.prisma.notificationEvent.findUnique({
      where: { key: job.eventKey },
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

    if (!event) {
      // The catalog knows the key but the table does not — the sync has not
      // run yet on this deploy.
      this.logger.warn(`event ${job.eventKey} missing from NotificationEvent`);
      return [];
    }
    if (event.deprecated || !event.isActive) return [];

    return (
      event.schedule
        // A row with no channels selected is configured off, not an error.
        .filter((row) => row.channels.length > 0)
        .map((row) => ({
          ...job,
          offsetMinutes: row.offsetMinutes,
          channels: row.channels,
        }))
    );
  }
}
