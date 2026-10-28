import type { Prisma } from '@prisma/client';

export const DELIVERY_GRACE_DAYS = 2;

/**
 * How long a brand has to review delivered content before the order accepts
 * itself, when `ORDER_AUTO_ACCEPT_DAYS` says nothing.
 *
 * Calendar days, like DELIVERY_GRACE_DAYS and the package's own
 * `deliveryDaysSnapshot` — every other clock in the order is counted this way,
 * and a working-day calendar (with holidays) is not something the platform has.
 */
export const DEFAULT_AUTO_ACCEPT_DAYS = 5;

/**
 * The review window, from `ORDER_AUTO_ACCEPT_DAYS`.
 *
 * Env-driven and pure, like {@link resolveOrderCompletionCreditPaise}: the
 * length of the window is a business decision, and changing it on test to watch
 * the sweep actually fire should not be a deploy. Anything unreadable — unset,
 * blank, a word, zero, negative — falls back to the default rather than
 * disabling the deadline, because a typo must not quietly strand every order in
 * DELIVERED again.
 *
 * Fractional values are allowed ON PURPOSE: 5 days is a long time to sit and
 * watch a cron, and `ORDER_AUTO_ACCEPT_DAYS=0.01` (about 15 minutes) makes the
 * whole flow testable in one sitting. Production uses whole days.
 */
export function resolveAutoAcceptDays(
  raw: string | number | undefined,
): number {
  const days = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim());
  if (!Number.isFinite(days) || days <= 0) return DEFAULT_AUTO_ACCEPT_DAYS;
  return days;
}

export function addCalendarDays(date: Date, days: number): Date {
  // Whole days move the calendar date, which keeps the wall-clock time across
  // a DST change — the behaviour every deadline in this file relies on.
  // `setDate` truncates, so a fractional window (test only, see
  // `resolveAutoAcceptDays`) has to be added as elapsed time instead.
  if (!Number.isInteger(days)) {
    return new Date(date.getTime() + days * 86_400_000);
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Orders whose first-delivery clock is past the promised due date but still
 * inside the grace window (content not yet delivered).
 */
export function inGracePeriodWhere(
  now: Date = new Date(),
): Prisma.OrderWhereInput {
  return {
    deliveredAt: null,
    deliveryDueAt: { lte: now },
    deliveryGraceDeadlineAt: { gt: now },
  };
}

/** Promised delivery due date from when the delivery clock starts. */
export function computeDeliveryDueAt(
  startAt: Date,
  deliveryDaysSnapshot: number,
): Date {
  return addCalendarDays(startAt, deliveryDaysSnapshot);
}

/** Final cutoff after the grace period following the promised due date. */
export function computeDeliveryGraceDeadlineAt(deliveryDueAt: Date): Date {
  return addCalendarDays(deliveryDueAt, DELIVERY_GRACE_DAYS);
}

/**
 * Deadline after which delivered content accepts itself, or null when no clock
 * should be running.
 *
 * Anchored to the LATER of the promised due date and the actual delivery, which
 * is the only reading that is fair in both directions. Anchoring to the due
 * date alone would auto-accept a late delivery almost immediately — deliver six
 * days late and the brand's five days are already spent. Anchoring to the
 * delivery alone would punish a creator for being early: a video sent on day 2
 * of a ten-day package would close on day 7, before the brand expected to look
 * at it.
 *
 * `deliveryDueAt` is null on orders predating the delivery-deadline fields, so
 * those fall back to the delivery itself rather than never auto-accepting.
 */
export function computeAutoAcceptAt(params: {
  deliveryDueAt: Date | null;
  deliveredAt: Date | null;
  /** Window length, from {@link resolveAutoAcceptDays}. */
  days: number;
}): Date | null {
  if (!params.deliveredAt) return null;
  const anchor =
    params.deliveryDueAt && params.deliveryDueAt > params.deliveredAt
      ? params.deliveryDueAt
      : params.deliveredAt;
  return addCalendarDays(anchor, params.days);
}

export function computeDeliveryDeadlines(
  startAt: Date,
  deliveryDaysSnapshot: number,
): { deliveryDueAt: Date; deliveryGraceDeadlineAt: Date } {
  const deliveryDueAt = computeDeliveryDueAt(startAt, deliveryDaysSnapshot);
  return {
    deliveryDueAt,
    deliveryGraceDeadlineAt: computeDeliveryGraceDeadlineAt(deliveryDueAt),
  };
}
