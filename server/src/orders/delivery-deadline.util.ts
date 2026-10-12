import type { Prisma } from '@prisma/client';

export const DELIVERY_GRACE_DAYS = 2;

export function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Orders whose first-delivery clock is past the promised due date but still
 * inside the grace window (content not yet delivered).
 */
export function inGracePeriodWhere(now: Date = new Date()): Prisma.OrderWhereInput {
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
