"use client";

import { Check, Circle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "../../api/types";

interface CreatorOrderActivityTimelineProps {
  order: OrderDetailsPublic;
}

interface TimelineEvent {
  key: string;
  title: string;
  description: string;
  date: string | null;
  status: "completed" | "active" | "pending";
  color: "green" | "purple" | "orange" | "gray" | "red";
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

/**
 * Builds the order timeline from the *creator's* perspective — the copy
 * describes what the creator sees and does at each stage (the brand ships,
 * you create, you deliver, you get paid), unlike the brand-side timeline.
 */
function buildCreatorTimelineEvents(order: OrderDetailsPublic): TimelineEvent[] {
  let effectiveStatus = order.status;
  if (order.status === "DISPUTED") {
    if (order.deliveredAt) {
      effectiveStatus = "DELIVERED";
    } else if (order.requiresPhysicalProductShipment) {
      if (order.productReceivedAt) effectiveStatus = "PRODUCT_RECEIVED";
      else if (order.dispatchedAt) effectiveStatus = "PRODUCT_SHIPPED";
      else if (order.briefAcceptedAt) effectiveStatus = "BRIEF_ACCEPTED";
      else effectiveStatus = "BRIEF_SUBMITTED";
    } else if (order.briefAcceptedAt) {
      effectiveStatus = "BRIEF_ACCEPTED";
    } else {
      effectiveStatus = "BRIEF_SUBMITTED";
    }
  }

  const events: TimelineEvent[] = [];
  const briefShared = Boolean(order.briefSubmittedAt) || order.hasBrief;

  events.push({
    key: "payment",
    title: "Payment Secured",
    description: "The brand's payment for this order is held securely.",
    date: formatEventDate(order.paidAt),
    status: order.paidAt ? "completed" : "pending",
    color: order.paidAt ? "green" : "gray",
  });

  events.push({
    key: "brief_shared",
    title: briefShared ? "Brief Received" : "Awaiting Brief",
    description: briefShared
      ? "The brand shared the brief for this project."
      : "Waiting for the brand to share the brief.",
    date: formatEventDate(order.briefSubmittedAt),
    status: briefShared ? "completed" : "pending",
    color: briefShared ? "green" : "gray",
  });

  const awaitingAcceptance = effectiveStatus === "BRIEF_SUBMITTED";
  events.push({
    key: "accepted",
    title: order.briefAcceptedAt ? "Brief Accepted" : "Accept the Brief",
    description: order.briefAcceptedAt
      ? "You accepted the brief and started this project."
      : awaitingAcceptance
        ? "Review the brief, then accept it or reject it with a reason."
        : "You'll review the brief and accept it to get started.",
    date: formatEventDate(order.briefAcceptedAt),
    status: order.briefAcceptedAt
      ? "completed"
      : awaitingAcceptance
        ? "active"
        : "pending",
    color: order.briefAcceptedAt
      ? "green"
      : awaitingAcceptance
        ? "orange"
        : "gray",
  });

  if (order.requiresPhysicalProductShipment) {
    const awaitingShipment = effectiveStatus === "BRIEF_ACCEPTED";
    events.push({
      key: "shipment",
      title: order.dispatchedAt ? "Product Shipped" : "Awaiting Shipment",
      description: order.dispatchedAt
        ? "The brand shipped the product to your address."
        : awaitingShipment
          ? "Waiting for the brand to ship the product to you."
          : "The brand will ship the product to your address.",
      date: formatEventDate(order.dispatchedAt),
      status: order.dispatchedAt
        ? "completed"
        : awaitingShipment
          ? "active"
          : "pending",
      color: order.dispatchedAt
        ? "green"
        : awaitingShipment
          ? "orange"
          : "gray",
    });

    const productReceived = Boolean(order.productReceivedAt);
    const awaitingReceipt = effectiveStatus === "PRODUCT_SHIPPED";
    events.push({
      key: "product_received",
      title: productReceived ? "Product Received" : "Receive the Product",
      description: productReceived
        ? "You confirmed the product arrived."
        : awaitingReceipt
          ? "Mark the product as received once it reaches you."
          : "Confirm receipt once the product reaches you.",
      date: formatEventDate(order.productReceivedAt),
      status: productReceived
        ? "completed"
        : awaitingReceipt
          ? "active"
          : "pending",
      color: productReceived
        ? "green"
        : awaitingReceipt
          ? "orange"
          : "gray",
    });
  }

  const inProgressStatuses = ["PRODUCT_RECEIVED"];
  if (!order.requiresPhysicalProductShipment) {
    inProgressStatuses.push("BRIEF_ACCEPTED");
  }
  const isInProgress = inProgressStatuses.includes(effectiveStatus);
  const isPastInProgress = [
    "DELIVERED",
    "REVISION_REQUESTED",
    "REVISION_SUBMITTED",
    "ACCEPTED",
    "CREATOR_PAYMENT_DONE",
  ].includes(effectiveStatus);
  events.push({
    key: "in_progress",
    title: "Create Content",
    description: isPastInProgress
      ? "You created the content for this order."
      : isInProgress
        ? "Create your content and upload it for review."
        : "You'll create the content once you're ready to start.",
    date: null,
    status: isPastInProgress ? "completed" : isInProgress ? "active" : "pending",
    color: isPastInProgress ? "green" : isInProgress ? "purple" : "gray",
  });

  const revisionActive = effectiveStatus === "REVISION_REQUESTED";
  if (revisionActive || order.revisionCount > 0) {
    events.push({
      key: "revision",
      title: "Revision Requested",
      description: revisionActive
        ? "The brand asked for changes — upload your revised content."
        : "You submitted a revised version based on the brand's notes.",
      date: formatEventDate(
        order.currentRevision?.requestedAt ?? order.updatedAt,
      ),
      status: revisionActive ? "active" : "completed",
      color: revisionActive ? "orange" : "green",
    });
  }

  events.push({
    key: "delivered",
    title: "Delivered",
    description: order.deliveredAt
      ? "You delivered your content for the brand to review."
      : "Upload your content to deliver it for review.",
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
    description: isCompleted
      ? "The brand approved your content and your payout was released."
      : "Once the brand approves, your payout is released.",
    date: formatEventDate(completedDate),
    status: isCompleted ? "completed" : "pending",
    color: isCompleted ? "green" : "gray",
  });

  const isCancelled =
    order.status === "REJECTED" || order.status === "REFUNDED";
  if (!isCancelled) return events;

  const cancelledByCreator = order.cancelledBy === "CREATOR";
  const cancelledEvent: TimelineEvent = {
    key: "cancelled",
    title: cancelledByCreator ? "Rejected" : "Cancelled",
    description: cancelledByCreator
      ? "You rejected this order."
      : order.cancelledBy === "BRAND"
        ? "The brand cancelled this order."
        : "This order was cancelled.",
    date: formatEventDate(
      order.cancelledAt ?? order.refundedAt ?? order.updatedAt,
    ),
    status: "active",
    color: "red",
  };

  let lastCompleted = -1;
  const normalized = events.map((event, index) => {
    if (event.status === "completed") lastCompleted = index;
    if (event.status === "active") {
      return { ...event, status: "pending" as const, color: "gray" as const };
    }
    return event;
  });

  return [
    ...normalized.slice(0, lastCompleted + 1),
    cancelledEvent,
    ...normalized.slice(lastCompleted + 1),
  ];
}

const DOT_COLORS = {
  green: "bg-emerald-500 border-emerald-200 dark:border-emerald-500/30",
  purple: "bg-primary border-primary/20",
  orange: "bg-amber-500 border-amber-200 dark:border-amber-500/30",
  gray: "bg-muted-foreground/30 border-border",
  red: "bg-red-500 border-red-200 dark:border-red-500/30",
};

const LINE_COLORS = {
  green: "bg-emerald-500",
  purple: "bg-primary",
  orange: "bg-amber-500",
  gray: "bg-border",
  red: "bg-red-500",
};

export function CreatorOrderActivityTimeline({
  order,
}: Readonly<CreatorOrderActivityTimelineProps>) {
  const events = buildCreatorTimelineEvents(order);
  const isTerminal = events.some((event) => event.key === "cancelled");

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-bold text-foreground mb-6">
        Activity Timeline
      </h3>

      <div className="relative">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          const Icon =
            event.key === "cancelled"
              ? X
              : event.status === "completed"
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
                      event.key === "cancelled"
                        ? "text-red-600 dark:text-red-400"
                        : event.status === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground",
                    )}
                  >
                    {event.title}
                  </p>
                  {event.date ? (
                    <span
                      className={cn(
                        "text-xs",
                        event.key === "cancelled"
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {event.date}
                    </span>
                  ) : event.status === "active" ? (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Current step
                    </span>
                  ) : event.status === "pending" && !isTerminal ? (
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
