import { Injectable, Logger } from '@nestjs/common';
import { NotificationQueueService } from '../queues/notification-queue.service';
import type { NotificationEventKey } from '../catalog/event-catalog';

export type EmitOptions = {
  /** The row the event is about: an order id, a profile id. */
  entityId: string;
  /**
   * Distinguishes repeat occurrences of the same event on the same entity.
   * Required whenever an event can fire more than once for one row — a
   * revision number, a delivery id — otherwise the second occurrence is
   * treated as a duplicate of the first and never sends.
   */
  occurrenceKey?: string;
  /** Sequence clock. Defaults to now; pass the real moment when it differs. */
  occurredAt?: Date;
};

/**
 * The notification module's only public export.
 *
 * Everything else — the catalog, the renderer, the queues, the log — is
 * internal. A caller states that something happened and returns; it does not
 * know that email or WhatsApp exist.
 *
 * Must be called **after** the surrounding transaction commits: emitting inside
 * one that later rolls back would notify about something that never happened.
 */
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(private readonly queues: NotificationQueueService) {}

  async emit(
    eventKey: NotificationEventKey,
    options: EmitOptions,
  ): Promise<void> {
    try {
      await this.queues.enqueueEvent({
        eventKey,
        entityId: options.entityId,
        occurrenceKey: options.occurrenceKey ?? options.entityId,
        occurredAt: (options.occurredAt ?? new Date()).toISOString(),
      });
    } catch (err) {
      // Never let a notification take down the request that triggered it —
      // matching today's fire-and-forget behaviour.
      this.logger.error(
        `emit ${eventKey} for ${options.entityId} failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
