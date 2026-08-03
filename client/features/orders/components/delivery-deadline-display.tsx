"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  getDeliveryTimeline,
  type DeliveryTimelineInput,
} from "../lib/delivery-timeline";

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const formatDeliveryDate = formatDate;

interface DeliveryDeadlineDisplayProps {
  order: DeliveryTimelineInput;
  className?: string;
  showBadge?: boolean;
  dateClassName?: string;
}

export function DeliveryDeadlineDisplay({
  order,
  className,
  showBadge = true,
  dateClassName,
}: DeliveryDeadlineDisplayProps) {
  const timeline = useMemo(() => getDeliveryTimeline(order), [order]);

  if (timeline.phase === "not_started") {
    return (
      <span className={className}>{timeline.displayDateLabel}</span>
    );
  }

  if (timeline.phase === "delivered") {
    return (
      <span className={className}>
        {formatDate(timeline.displayDate) ?? "Delivered"}
      </span>
    );
  }

  const remaining = timeline.daysRemaining;
  const dateLabel = formatDate(timeline.displayDate);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={dateClassName}>
        {timeline.isInGrace ? (
          <>
            <span className="text-muted-foreground">Grace ends </span>
            {dateLabel}
          </>
        ) : timeline.phase === "overdue" ? (
          "Overdue"
        ) : (
          dateLabel
        )}
      </span>
      {showBadge && remaining !== null && timeline.phase !== "overdue" && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border-0",
            timeline.isInGrace
              ? "bg-amber-500/10 text-amber-600"
              : remaining <= 3
                ? "bg-red-500/10 text-red-600"
                : remaining <= 7
                  ? "bg-amber-500/10 text-amber-600"
                  : "bg-emerald-500/10 text-emerald-600",
          )}
        >
          {timeline.isInGrace ? "Grace: " : ""}
          {remaining} day{remaining !== 1 ? "s" : ""} left
        </Badge>
      )}
    </div>
  );
}

export function getDeliveryDeadlineLabel(order: DeliveryTimelineInput): string {
  const timeline = getDeliveryTimeline(order);
  if (timeline.phase === "not_started") return timeline.displayDateLabel;
  if (timeline.phase === "overdue") return "Overdue";
  if (timeline.phase === "delivered") {
    return formatDate(timeline.displayDate) ?? "Delivered";
  }
  const date = formatDate(timeline.displayDate);
  if (timeline.isInGrace) return `Grace ends ${date ?? ""}`.trim();
  return date ?? "TBD";
}

/** Compact value + label for order list cards (avoids long single-line grace text). */
export function getDeliveryDeadlineCardMeta(
  order: DeliveryTimelineInput & {
    status?: string;
    acceptedAt?: string | null;
    updatedAt?: string | null;
  },
): { value: string; label: string; showBadge: boolean } {
  const timeline = getDeliveryTimeline(order);
  const date = formatDate(timeline.displayDate);

  if (order.status === "COMPLETED" || order.status === "ACCEPTED" || order.status === "CREATOR_PAYMENT_DONE") {
    return {
      value:
        formatDate(order.acceptedAt) ??
        formatDate(order.deliveredAt) ??
        formatDate(order.updatedAt) ??
        "—",
      label: "Completed on",
      showBadge: false,
    };
  }

  if (order.status === "DISPUTED") {
    return {
      value: formatDate(order.updatedAt) ?? "—",
      label: "Disputed on",
      showBadge: false,
    };
  }

  if (order.status === "REJECTED") {
    return {
      value: formatDate(order.updatedAt) ?? "—",
      label: "Rejected on",
      showBadge: false,
    };
  }

  if (order.status === "REFUNDED") {
    return {
      value: formatDate(order.updatedAt) ?? "—",
      label: "Refunded on",
      showBadge: false,
    };
  }

  if (order.status === "CANCELLED" || order.status === "ADMIN_CANCELLED") {
    return {
      value: formatDate(order.updatedAt) ?? "—",
      label: "Cancelled on",
      showBadge: false,
    };
  }

  if (
    order.status === "DELIVERED" ||
    order.status === "REVISION_SUBMITTED" ||
    order.status === "REVISION_REQUESTED"
  ) {
    return {
      value: formatDate(order.deliveredAt) ?? formatDate(order.updatedAt) ?? "—",
      label: "Delivered on",
      showBadge: false,
    };
  }

  if (timeline.phase === "not_started") {
    const days = order.deliveryDaysSnapshot;
    return {
      value: `${days} day${days === 1 ? "" : "s"}`,
      label: "Delivery time",
      showBadge: false,
    };
  }
  if (timeline.phase === "overdue") {
    return { value: "Overdue", label: "Past grace", showBadge: true };
  }
  if (timeline.isInGrace) {
    return { value: date ?? "—", label: "Grace ends", showBadge: true };
  }
  return { value: date ?? "TBD", label: "Due date", showBadge: true };
}
