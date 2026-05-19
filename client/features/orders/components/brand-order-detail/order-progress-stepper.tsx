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
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { OrderDetailsPublic } from "../../api/types";

interface OrderProgressStepperProps {
  order: OrderDetailsPublic;
}

interface StepDefinition {
  label: string;
  icon: React.ElementType;
  dateKey: keyof OrderDetailsPublic | null;
  statusMatch: string[];
  getHref?: (orderId: string) => string;
  isSkipped?: boolean;
}

const STEPS: StepDefinition[] = [
  {
    label: "Payment\nCompleted",
    icon: CreditCard,
    dateKey: "paidAt",
    statusMatch: [],
  },
  {
    label: "Brief\nSubmitted",
    icon: FileText,
    dateKey: "briefSubmittedAt",
    statusMatch: ["BRIEF_SUBMISSION_PENDING"],
  },
  {
    label: "Awaiting Creator\nAcceptance",
    icon: UserCheck,
    dateKey: "briefAcceptedAt",
    statusMatch: ["BRIEF_SUBMITTED"],
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
  },
  {
    label: "Delivered",
    icon: Truck,
    dateKey: "deliveredAt",
    statusMatch: ["DELIVERED", "REVISION_REQUESTED", "REVISION_SUBMITTED"],
  },
  {
    label: "Completed",
    icon: Star,
    dateKey: "acceptedAt",
    statusMatch: ["ACCEPTED", "CREATOR_PAYMENT_DONE"],
  },
];

function getActiveStepIndex(status: string, steps: StepDefinition[]): number {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].statusMatch.includes(status)) {
      return i;
    }
  }
  if (status === "PENDING_PAYMENT") return 0;
  if (["ACCEPTED", "CREATOR_PAYMENT_DONE", "REFUNDED"].includes(status))
    return steps.length;
  return 0;
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

export function OrderProgressStepper({ order }: OrderProgressStepperProps) {
  const steps = STEPS.map((step) => {
    if (
      step.label === "Awaiting\nShipment" &&
      !order.requiresPhysicalProductShipment
    ) {
      return {
        ...step,
        statusMatch: [],
        isSkipped: true,
      };
    }
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
  
  const activeIndex = getActiveStepIndex(order.status, steps);

  return (
    <div className="rounded-2xl border bg-card p-6 md:p-8 overflow-x-auto">
      <div className="flex items-start justify-between min-w-[700px]">
        {steps.map((step, index) => {
          const isSkipped = step.isSkipped;
          const isPassed = index <= activeIndex;
          const isCompleted = index < activeIndex && !isSkipped;
          const isActive = index === activeIndex && !isSkipped;
          const isPending = index > activeIndex || isSkipped;
          const Icon = step.icon;

          const dateValue = step.dateKey
            ? (order[step.dateKey] as string | null | undefined)
            : null;

          const StepContent = () => (
            <>
              <div
                className={cn(
                  "relative z-10 flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                  isSkipped
                    ? "border-border bg-muted/50 text-muted-foreground opacity-40"
                    : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/20"
                        : "border-border bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="size-5" strokeWidth={2.5} />
                ) : isSkipped ? (
                  <Icon className="size-4 opacity-50" />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>

              <p
                className={cn(
                  "mt-2 text-center text-xs font-medium whitespace-pre-line leading-tight",
                  isSkipped
                    ? "text-muted-foreground opacity-50 line-through decoration-muted-foreground/30"
                    : isCompleted
                      ? "text-foreground"
                      : isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground",
                )}
              >
                {step.label}
              </p>

              {isCompleted && dateValue ? (
                <p className="mt-1 text-[10px] text-muted-foreground text-center">
                  {formatStepDate(dateValue)}
                </p>
              ) : isActive ? (
                <span className="mt-1.5 text-[10px] font-semibold text-primary">
                  Current step
                </span>
              ) : isSkipped ? (
                <span className="mt-1.5 text-[10px] font-medium text-muted-foreground opacity-60">
                  Not Required
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
                      isPassed ? "bg-primary" : "bg-border",
                    )}
                  />
                </div>
              )}

              {step.getHref && (isActive || isCompleted) ? (
                <Link
                  href={step.getHref(order.id)}
                  className="flex flex-col items-center hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <StepContent />
                </Link>
              ) : (
                <div className="flex flex-col items-center">
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
