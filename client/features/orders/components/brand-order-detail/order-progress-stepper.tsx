"use client";

import {
  Check,
  CreditCard,
  FileText,
  UserCheck,
  Package,
  Play,
  Truck,
  Star,
  RotateCcw,
  FileVideo,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { OrderDetailsPublic } from "../../api/types";

interface OrderProgressStepperProps {
  order: OrderDetailsPublic;
  onStepClick?: (label: string) => void;
  previewState?: string | null;
}

interface StepDefinition {
  label: string;
  icon: React.ElementType;
  dateKey: keyof OrderDetailsPublic | null;
  getDate?: (order: OrderDetailsPublic) => string | null | undefined;
  statusMatch: string[];
  revisionStep?: boolean;
  disputeStep?: boolean;
  getHref?: (orderId: string) => string;
}

const DISPUTE_STEP: StepDefinition = {
  label: "Disputed",
  icon: AlertTriangle,
  dateKey: null,
  getDate: (order) => order.dispute?.openedAt ?? null,
  statusMatch: ["DISPUTED"],
  disputeStep: true,
  getHref: (orderId) => `/brand/orders/${orderId}`,
};

const STEPS: StepDefinition[] = [
  {
    label: "Payment\nCompleted",
    icon: CreditCard,
    dateKey: "paidAt",
    statusMatch: ["PENDING_PAYMENT"],
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Brief\nSubmitted",
    icon: FileText,
    dateKey: "briefSubmittedAt",
    statusMatch: ["BRIEF_SUBMISSION_PENDING"],
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Awaiting Creator\nAcceptance",
    icon: UserCheck,
    dateKey: "briefAcceptedAt",
    statusMatch: ["BRIEF_SUBMITTED"],
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Awaiting\nShipment",
    icon: Package,
    dateKey: "dispatchedAt",
    statusMatch: ["BRIEF_ACCEPTED"],
    getHref: (orderId) => `/brand/orders/${orderId}/shipping`,
  },
  {
    label: "In Progress",
    icon: Play,
    dateKey: null,
    statusMatch: ["PRODUCT_SHIPPED", "PRODUCT_RECEIVED"],
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Delivered",
    icon: Truck,
    dateKey: "deliveredAt",
    statusMatch: ["DELIVERED"],
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Revision\nRequested",
    icon: RotateCcw,
    dateKey: null,
    getDate: (order) => order.currentRevision?.requestedAt ?? null,
    statusMatch: ["REVISION_REQUESTED"],
    revisionStep: true,
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Revision\nSubmitted",
    icon: FileVideo,
    dateKey: null,
    getDate: (order) => order.updatedAt ?? null,
    statusMatch: ["REVISION_SUBMITTED"],
    revisionStep: true,
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
  {
    label: "Completed",
    icon: Star,
    dateKey: "acceptedAt",
    statusMatch: ["ACCEPTED", "CREATOR_PAYMENT_DONE"],
    getHref: (orderId) => `/brand/orders/${orderId}`,
  },
];

/** Reconstruct the status the order was in when the dispute was opened. */
function getPreDisputeStatus(order: OrderDetailsPublic): string {
  if (order.currentRevision?.requestedAt && !order.deliveredAt) {
    return "REVISION_REQUESTED";
  }
  if (order.deliveredAt) {
    // Prefer the latest revision stage when a revision was in flight.
    if (order.status === "REVISION_SUBMITTED") return "REVISION_SUBMITTED";
    if (order.status === "REVISION_REQUESTED") return "REVISION_REQUESTED";
    if (order.revisionCount > 0 && order.currentRevision) {
      // After a revision request/submit, deliveredAt is still set.
      return "REVISION_SUBMITTED";
    }
    return "DELIVERED";
  }
  if (order.requiresPhysicalProductShipment) {
    if (order.productReceivedAt) return "PRODUCT_RECEIVED";
    if (order.dispatchedAt) return "PRODUCT_SHIPPED";
    if (order.briefAcceptedAt) return "BRIEF_ACCEPTED";
    return "BRIEF_SUBMITTED";
  }
  if (order.briefAcceptedAt) return "BRIEF_ACCEPTED";
  return "BRIEF_SUBMITTED";
}

function getActiveStepIndex(order: OrderDetailsPublic, steps: StepDefinition[]): number {
  if (order.status === "DISPUTED") {
    const disputeIndex = steps.findIndex((step) => step.disputeStep);
    if (disputeIndex >= 0) return disputeIndex;
  }

  const effectiveStatus = order.status;

  for (let i = 0; i < steps.length; i++) {
    if (steps[i].statusMatch.includes(effectiveStatus)) {
      return i;
    }
  }
  if (["ACCEPTED", "CREATOR_PAYMENT_DONE", "REFUNDED"].includes(effectiveStatus))
    return steps.length;
  return 0;
}

function getStepDisplayLabel(
  step: StepDefinition,
  order: OrderDetailsPublic,
  stepIndex: number,
): string {
  if (stepIndex === 0 && order.status === "PENDING_PAYMENT") {
    return "Awaiting\nPayment";
  }
  return step.label;
}

function formatStepDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return (
    date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

export function OrderProgressStepper({ order, onStepClick, previewState }: OrderProgressStepperProps) {
  const baseSteps = STEPS
    .filter((step) => {
      if (step.revisionStep) {
        return (
          order.revisionCount > 0 ||
          order.status === "REVISION_REQUESTED" ||
          order.status === "REVISION_SUBMITTED" ||
          (order.status === "DISPUTED" &&
            (order.revisionCount > 0 ||
              getPreDisputeStatus(order) === "REVISION_REQUESTED" ||
              getPreDisputeStatus(order) === "REVISION_SUBMITTED"))
        );
      }
      if (
        step.label === "Awaiting\nShipment" &&
        !order.requiresPhysicalProductShipment
      ) {
        return false;
      }
      return true;
    })
    .map((step) => {
      if (
        step.label === "In Progress" &&
        !order.requiresPhysicalProductShipment
      ) {
        return {
          ...step,
          statusMatch: [...step.statusMatch, "BRIEF_ACCEPTED"],
        };
      }
      return step;
    });

  // Insert "Disputed" right after the stage the order was in when it opened,
  // so earlier stages stay completed and later ones stay pending.
  let steps = baseSteps;
  if (order.status === "DISPUTED") {
    const preStatus = getPreDisputeStatus(order);
    let insertAfter = baseSteps.findIndex((step) =>
      step.statusMatch.includes(preStatus),
    );
    if (insertAfter < 0) insertAfter = baseSteps.length - 2;
    steps = [
      ...baseSteps.slice(0, insertAfter + 1),
      DISPUTE_STEP,
      ...baseSteps.slice(insertAfter + 1),
    ];
  }
  
  const activeIndex = getActiveStepIndex(order, steps);
  const isDisputed = order.status === "DISPUTED";

  return (
    <div className="rounded-lg  bg-card p-6 md:p-8 overflow-x-auto">
      <div className="flex items-start justify-between min-w-[860px]">
        {steps.map((step, index) => {
          const isPassed = index <= activeIndex;
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isPending = index > activeIndex;
          const isAwaitingPayment =
            order.status === "PENDING_PAYMENT" && index === 0;
          const isDisputeActive = isDisputed && isActive && Boolean(step.disputeStep);
          const displayLabel = getStepDisplayLabel(step, order, index);
          const Icon = step.icon;

          const dateValue = step.getDate
            ? step.getDate(order)
            : step.dateKey
              ? (order[step.dateKey] as string | null | undefined)
              : null;

          const StepContent = () => (
            <>
              <div
                className={cn(
                  "relative z-10 flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                      ? isAwaitingPayment || isDisputeActive
                        ? "border-amber-500 bg-amber-50 text-amber-600 ring-4 ring-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                        : "border-primary bg-primary/10 text-primary ring-4 ring-primary/20"
                      : "border-border bg-muted text-muted-foreground",
                  previewState === step.label &&
                    "ring-4 ring-primary/40 ring-offset-2",
                )}
              >
                {isCompleted ? (
                  <Check className="size-5" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>

              <p
                className={cn(
                  "mt-2 text-center text-xs font-medium whitespace-pre-line leading-tight",
                  isCompleted
                    ? "text-foreground"
                    : isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground",
                )}
              >
                {displayLabel}
              </p>

              {isCompleted && dateValue ? (
                <p className="mt-1 text-[10px] text-muted-foreground text-center">
                  {formatStepDate(dateValue)}
                </p>
              ) : isActive ? (
                <span
                  className={cn(
                    "mt-1.5 text-[10px] font-semibold",
                    isAwaitingPayment || isDisputeActive
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-primary",
                  )}
                >
                  {isAwaitingPayment
                    ? "Payment pending"
                    : isDisputeActive
                      ? "Under review"
                      : "Current step"}
                </span>
              ) : isPending ? (
                <span className="mt-1 h-3" />
              ) : null}
            </>
          );

          return (
            <div
              key={step.label}
              className="flex-1 flex flex-col items-center relative"
            >
              {index > 0 && (
                <div
                  className="absolute top-5 right-1/2 w-full h-0.5 -translate-y-1/2"
                  style={{ zIndex: 0 }}
                >
                  <div
                    className={cn(
                      "h-full w-full",
                      isPassed
                        ? isDisputeActive || (isDisputed && index <= activeIndex)
                          ? index === activeIndex
                            ? "bg-amber-500"
                            : "bg-primary"
                          : "bg-primary"
                        : "bg-border",
                    )}
                  />
                </div>
              )}

              {step.getHref &&
              (isActive || isCompleted) &&
              (!onStepClick || step.label === "Awaiting\nShipment") ? (
                <Link
                  href={step.getHref(order.id)}
                  className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <StepContent />
                </Link>
              ) : (
                <div
                  className={cn(
                    "flex flex-col items-center",
                    onStepClick && (isActive || isCompleted)
                      ? "cursor-pointer hover:opacity-80 transition-opacity"
                      : "",
                  )}
                  onClick={() => {
                    if (onStepClick && (isActive || isCompleted)) {
                      onStepClick(step.label);
                    }
                  }}
                >
                  <StepContent />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
