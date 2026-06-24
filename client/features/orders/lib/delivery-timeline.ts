export const DELIVERY_GRACE_DAYS = 2;

export type DeliveryTimelinePhase =
  | "not_started"
  | "promised"
  | "grace"
  | "overdue"
  | "delivered";

export interface DeliveryTimelineInput {
  deliveryDaysSnapshot: number;
  briefAcceptedAt?: string | null;
  productReceivedAt?: string | null;
  deliveryDueAt?: string | null;
  deliveryGraceDeadlineAt?: string | null;
  deliveredAt?: string | null;
  requiresPhysicalProductShipment?: boolean;
}

export interface DeliveryTimeline {
  phase: DeliveryTimelinePhase;
  targetAt: string | null;
  label: string;
  daysRemaining: number | null;
  displayDate: string | null;
  displayDateLabel: string;
  isInGrace: boolean;
}

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function getDeliveryTimeline(
  order: DeliveryTimelineInput,
  now: Date = new Date(),
): DeliveryTimeline {
  if (order.deliveredAt) {
    return {
      phase: "delivered",
      targetAt: null,
      label: "Delivered",
      daysRemaining: null,
      displayDate: order.deliveredAt,
      displayDateLabel: "Delivered",
      isInGrace: false,
    };
  }

  const clockStarted = order.requiresPhysicalProductShipment
    ? order.productReceivedAt
    : order.briefAcceptedAt;

  if (!clockStarted && !order.deliveryDueAt) {
    const days = order.deliveryDaysSnapshot;
    return {
      phase: "not_started",
      targetAt: null,
      label: "Not started",
      daysRemaining: null,
      displayDate: null,
      displayDateLabel: `Delivery in ${days} day${days === 1 ? "" : "s"}`,
      isInGrace: false,
    };
  }

  const dueAt = order.deliveryDueAt
    ? new Date(order.deliveryDueAt)
    : addCalendarDays(new Date(clockStarted!), order.deliveryDaysSnapshot);

  const graceEnd = order.deliveryGraceDeadlineAt
    ? new Date(order.deliveryGraceDeadlineAt)
    : addCalendarDays(dueAt, DELIVERY_GRACE_DAYS);

  const nowMs = now.getTime();

  if (nowMs < dueAt.getTime()) {
    return {
      phase: "promised",
      targetAt: dueAt.toISOString(),
      label: "Due date",
      daysRemaining: daysBetween(now, dueAt),
      displayDate: dueAt.toISOString(),
      displayDateLabel: "Due date",
      isInGrace: false,
    };
  }

  if (nowMs < graceEnd.getTime()) {
    return {
      phase: "grace",
      targetAt: graceEnd.toISOString(),
      label: "Grace period ends",
      daysRemaining: daysBetween(now, graceEnd),
      displayDate: graceEnd.toISOString(),
      displayDateLabel: "Grace period ends",
      isInGrace: true,
    };
  }

  return {
    phase: "overdue",
    targetAt: graceEnd.toISOString(),
    label: "Overdue",
    daysRemaining: 0,
    displayDate: graceEnd.toISOString(),
    displayDateLabel: "Overdue",
    isInGrace: false,
  };
}
