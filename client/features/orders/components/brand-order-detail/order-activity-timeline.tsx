"use client";

import { Check, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "../../api/types";

interface OrderActivityTimelineProps {
  order: OrderDetailsPublic;
}

interface TimelineEvent {
  key: string;
  title: string;
  description: string;
  date: string | null;
  status: "completed" | "active" | "pending";
  color: "green" | "purple" | "orange" | "gray";
}

function formatEventDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return (
    date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " • " +
    date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

function buildTimelineEvents(order: OrderDetailsPublic): TimelineEvent[] {
  let effectiveStatus = order.status;
  if (order.status === "DISPUTED") {
    if (order.deliveredAt) {
      effectiveStatus = "DELIVERED";
    } else if (order.requiresPhysicalProductShipment) {
      if (order.productReceivedAt) effectiveStatus = "PRODUCT_RECEIVED";
      else if (order.dispatchedAt) effectiveStatus = "PRODUCT_SHIPPED";
      else if (order.briefAcceptedAt) effectiveStatus = "BRIEF_ACCEPTED";
      else effectiveStatus = "BRIEF_SUBMITTED";
    } else {
      if (order.briefAcceptedAt) effectiveStatus = "BRIEF_ACCEPTED";
      else effectiveStatus = "BRIEF_SUBMITTED";
    }
  }

  const events: TimelineEvent[] = [];
  const briefSubmitted =
    Boolean(order.briefSubmittedAt) || order.hasBrief;
  const awaitingBriefSubmission =
    effectiveStatus === "BRIEF_SUBMISSION_PENDING" && !briefSubmitted;

  events.push({
    key: "payment",
    title: "Payment Completed",
    description: "Your payment has been successfully processed.",
    date: formatEventDate(order.paidAt),
    status: order.paidAt ? "completed" : "pending",
    color: order.paidAt ? "green" : "gray",
  });

  events.push({
    key: "brief_submitted",
    title: briefSubmitted
      ? "Brief Submitted"
      : awaitingBriefSubmission
        ? "Submit Your Brief"
        : "Brief Submission",
    description: briefSubmitted
      ? "You submitted the brief for this project."
      : awaitingBriefSubmission
        ? "Submit your project brief so the creator can review and accept it."
        : "Your brief will be shared with the creator for this project.",
    date: formatEventDate(order.briefSubmittedAt),
    status: briefSubmitted
      ? "completed"
      : awaitingBriefSubmission
        ? "active"
        : "pending",
    color: briefSubmitted
      ? "green"
      : awaitingBriefSubmission
        ? "orange"
        : "gray",
  });

  events.push({
    key: "creator_acceptance",
    title: "Awaiting Creator Acceptance",
    description:
      "The creator will review your brief and accept or decline the project.",
    date: formatEventDate(order.briefAcceptedAt),
    status: order.briefAcceptedAt
      ? "completed"
      : effectiveStatus === "BRIEF_SUBMITTED"
        ? "active"
        : "pending",
    color: order.briefAcceptedAt
      ? "green"
      : effectiveStatus === "BRIEF_SUBMITTED"
        ? "orange"
        : "gray",
  });

  if (order.requiresPhysicalProductShipment) {
    events.push({
      key: "shipment",
      title: "Awaiting Shipment",
      description: "Ship the product to the creator.",
      date: formatEventDate(order.dispatchedAt),
      status: order.dispatchedAt
        ? "completed"
        : effectiveStatus === "BRIEF_ACCEPTED"
          ? "active"
          : "pending",
      color: order.dispatchedAt
        ? "green"
        : effectiveStatus === "BRIEF_ACCEPTED"
          ? "orange"
          : "gray",
    });
  }

  const inProgressStatuses = ["PRODUCT_SHIPPED", "PRODUCT_RECEIVED"];
  const isInProgress = inProgressStatuses.includes(effectiveStatus);
  const isPastInProgress = [
    "DELIVERED",
    "REVISION_REQUESTED",
    "REVISION_SUBMITTED",
    "ACCEPTED",
    "CREATOR_PAYMENT_DONE",
    "REFUNDED",
  ].includes(effectiveStatus);
  events.push({
    key: "in_progress",
    title: "In Progress",
    description: "Creator is working on your content.",
    date: null,
    status: isPastInProgress
      ? "completed"
      : isInProgress
        ? "active"
        : "pending",
    color: isPastInProgress ? "green" : isInProgress ? "purple" : "gray",
  });

  events.push({
    key: "delivered",
    title: "Delivered",
    description: "Content has been delivered for review.",
    date: formatEventDate(order.deliveredAt),
    status: order.deliveredAt ? "completed" : "pending",
    color: order.deliveredAt ? "green" : "gray",
  });

  const completedDate = order.acceptedAt ?? order.creatorPaidAt;
  const isCompleted = ["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(
    effectiveStatus,
  );
  events.push({
    key: "completed",
    title: "Completed",
    description: "Order has been completed.",
    date: formatEventDate(completedDate),
    status: isCompleted ? "completed" : "pending",
    color: isCompleted ? "green" : "gray",
  });

  return events;
}

const DOT_COLORS = {
  green: "bg-emerald-500 border-emerald-200 dark:border-emerald-500/30",
  purple: "bg-primary border-primary/20",
  orange: "bg-amber-500 border-amber-200 dark:border-amber-500/30",
  gray: "bg-muted-foreground/30 border-border",
};

const LINE_COLORS = {
  green: "bg-emerald-500",
  purple: "bg-primary",
  orange: "bg-amber-500",
  gray: "bg-border",
};

export function OrderActivityTimeline({ order }: OrderActivityTimelineProps) {
  const events = buildTimelineEvents(order);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Activity Timeline
      </h3>

      <div className="relative">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          const Icon =
            event.status === "completed"
              ? Check
              : event.status === "active"
                ? Clock
                : Circle;

          return (
            <div key={event.key} className="flex gap-4 relative">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2",
                    DOT_COLORS[event.color],
                    event.status === "completed" && "text-white",
                    event.status === "active" && "text-white",
                    event.status === "pending" && "text-muted-foreground/50",
                  )}
                >
                  <Icon className="size-3.5" strokeWidth={2.5} />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-8",
                      LINE_COLORS[event.color],
                    )}
                  />
                )}
              </div>

              <div className={cn("pb-6", isLast && "pb-0")}>
                <div className="flex items-center gap-3 flex-wrap">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      event.status === "pending"
                        ? "text-muted-foreground"
                        : "text-foreground",
                    )}
                  >
                    {event.title}
                  </p>
                  {event.date ? (
                    <span className="text-xs text-muted-foreground">
                      {event.date}
                    </span>
                  ) : event.status === "active" ? (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Current step
                    </span>
                  ) : event.status === "pending" ? (
                    <span className="text-xs text-muted-foreground italic">
                      Up next
                    </span>
                  ) : null}
                </div>
                {event.status !== "pending" && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {event.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
