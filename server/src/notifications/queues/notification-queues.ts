import type { NotificationChannel } from '@prisma/client';

/**
 * Queue names, job shapes and jobId construction — shared by every producer and
 * consumer so the two can never drift.
 *
 * Three queues rather than one, because a BullMQ rate limiter is **per queue**.
 * With the population sweep and transactional sends sharing a queue, a ten
 * thousand profile sweep draining at 120/min would hold an order confirmation
 * behind it for over an hour. `notif-step` therefore runs unlimited, and only
 * `notif-bulk` carries the rate cap.
 */
export const QUEUE = {
  /** One job per emit(); fans the event out across its schedule rows. */
  event: 'notif-event',
  /** Transactional sends and delayed drip rows. No rate limiter. */
  step: 'notif-step',
  /** Population-sweep sends only. Rate limited. */
  bulk: 'notif-bulk',
} as const;

export const JOB = {
  eventEmitted: 'event.emitted',
  stepDue: 'step.due',
} as const;

export type EventJobData = {
  eventKey: string;
  entityId: string;
  /**
   * Distinguishes repeat occurrences of the same event on the same entity —
   * a revision number, a delivery id. Defaults to entityId at emit time.
   */
  occurrenceKey: string;
  /** Sequence clock: offsets are measured from here, not from enqueue time. */
  occurredAt: string;
};

export type StepJobData = EventJobData & {
  /**
   * The schedule row is identified by its offset, never by its row id: the
   * admin replaces the whole schedule in one transaction, so a row id in a
   * delayed job would be orphaned.
   */
  offsetMinutes: number;
  channels: NotificationChannel[];
};

/** Deterministic, so a repeated emit is refused by BullMQ before it becomes work. */
export function eventJobId(d: EventJobData): string {
  return `nev-${d.eventKey}-${d.entityId}-${d.occurrenceKey}`;
}

export function stepJobId(d: StepJobData): string {
  return `nst-${d.eventKey}-${d.entityId}-${d.occurrenceKey}-${d.offsetMinutes}`;
}

/**
 * Delay for a step, measured from the sequence clock rather than from now — so
 * a job enqueued late (a backlog, a redeploy) still lands on schedule instead
 * of a full offset late. Same arithmetic as buildCompletionReminderJobs.
 */
export function stepDelayMs(
  offsetMinutes: number,
  occurredAt: Date,
  now: number = Date.now(),
): number {
  return Math.max(offsetMinutes * 60_000 - (now - occurredAt.getTime()), 0);
}

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 60_000 },
  removeOnComplete: 1000,
  removeOnFail: 1000,
};
