"use client";

import {
  AlertTriangle,
  Check,
  CreditCard,
  FileText,
  FileVideo,
  Info,
  Package,
  Play,
  RotateCcw,
  Star,
  Truck,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "../../api/types";

interface CreatorOrderProgressStepperProps {
  order: OrderDetailsPublic;
}

interface StepDefinition {
  label: string;
  icon: React.ElementType;
  dateKey: keyof OrderDetailsPublic | null;
  getDate?: (order: OrderDetailsPublic) => string | null | undefined;
  statusMatch: string[];
  revisionStep?: boolean;
  disputeStep?: boolean;
  cancelledStep?: boolean;
}

interface StepPresentation {
  title: string;
  description?: string;
  hint?: string;
}

const DISPUTE_STEP: StepDefinition = {
  label: "Disputed",
  icon: AlertTriangle,
  dateKey: null,
  getDate: (order) => order.dispute?.openedAt ?? null,
  statusMatch: ["DISPUTED"],
  disputeStep: true,
};

const CANCELLED_STEP: StepDefinition = {
  label: "Cancelled",
  icon: XCircle,
  dateKey: null,
  getDate: (order) => order.cancelledAt ?? order.refundedAt ?? order.updatedAt,
  statusMatch: ["REJECTED", "REFUNDED"],
  cancelledStep: true,
};

const STEPS: StepDefinition[] = [
  {
    label: "Payment Completed",
    icon: CreditCard,
    dateKey: "paidAt",
    statusMatch: ["PENDING_PAYMENT"],
  },
  {
    label: "Brief Submission",
    icon: FileText,
    dateKey: "briefSubmittedAt",
    statusMatch: ["BRIEF_SUBMISSION_PENDING"],
  },
  {
    label: "Awaiting Creator Acceptance",
    icon: UserCheck,
    dateKey: "briefAcceptedAt",
    statusMatch: ["BRIEF_SUBMITTED"],
  },
  {
    label: "Awaiting Shipment",
    icon: Package,
    dateKey: "dispatchedAt",
    statusMatch: ["BRIEF_ACCEPTED"],
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
    statusMatch: ["DELIVERED"],
  },
  {
    label: "Revision Requested",
    icon: RotateCcw,
    dateKey: null,
    getDate: (order) => order.currentRevision?.requestedAt ?? null,
    statusMatch: ["REVISION_REQUESTED"],
    revisionStep: true,
  },
  {
    label: "Revision Submitted",
    icon: FileVideo,
    dateKey: null,
    getDate: (order) => order.updatedAt ?? null,
    statusMatch: ["REVISION_SUBMITTED"],
    revisionStep: true,
  },
  {
    label: "Completed",
    icon: Star,
    dateKey: "acceptedAt",
    statusMatch: ["ACCEPTED", "CREATOR_PAYMENT_DONE"],
  },
];

function getPreDisputeStatus(order: OrderDetailsPublic): string {
  if (order.currentRevision?.requestedAt && !order.deliveredAt) {
    return "REVISION_REQUESTED";
  }
  if (order.deliveredAt) {
    if (order.status === "REVISION_SUBMITTED") return "REVISION_SUBMITTED";
    if (order.status === "REVISION_REQUESTED") return "REVISION_REQUESTED";
    if (order.revisionCount > 0 && order.currentRevision) {
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

function getLastReachedStatus(order: OrderDetailsPublic): string {
  if (order.deliveredAt) {
    if (order.revisionCount > 0 && order.currentRevision) {
      return "REVISION_SUBMITTED";
    }
    return "DELIVERED";
  }
  if (order.requiresPhysicalProductShipment) {
    if (order.productReceivedAt) return "PRODUCT_RECEIVED";
    if (order.dispatchedAt) return "PRODUCT_SHIPPED";
    if (order.briefAcceptedAt) return "BRIEF_ACCEPTED";
  } else if (order.briefAcceptedAt) {
    return "BRIEF_ACCEPTED";
  }
  if (order.briefSubmittedAt) return "BRIEF_SUBMISSION_PENDING";
  return "PENDING_PAYMENT";
}

function insertTerminalStep(
  baseSteps: StepDefinition[],
  order: OrderDetailsPublic,
  terminalStep: StepDefinition,
): StepDefinition[] {
  const preStatus = getLastReachedStatus(order);
  let insertAfter = baseSteps.findIndex((step) =>
    step.statusMatch.includes(preStatus),
  );
  if (insertAfter < 0) {
    const completedIdx = baseSteps.findIndex(
      (step) => step.label === "Completed",
    );
    insertAfter =
      completedIdx > 0 ? completedIdx - 1 : Math.max(0, baseSteps.length - 1);
  }
  return [
    ...baseSteps.slice(0, insertAfter + 1),
    terminalStep,
    ...baseSteps.slice(insertAfter + 1),
  ];
}

function getActiveStepIndex(
  order: OrderDetailsPublic,
  steps: StepDefinition[],
): number {
  if (order.status === "DISPUTED") {
    const disputeIndex = steps.findIndex((step) => step.disputeStep);
    if (disputeIndex >= 0) return disputeIndex;
  }
  if (order.status === "REJECTED" || order.status === "REFUNDED") {
    const cancelledIndex = steps.findIndex((step) => step.cancelledStep);
    if (cancelledIndex >= 0) return cancelledIndex;
  }

  for (let i = 0; i < steps.length; i++) {
    if (steps[i].statusMatch.includes(order.status)) {
      return i;
    }
  }
  if (["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(order.status)) {
    return steps.length;
  }
  return 0;
}

function getStepDisplayLabel(
  step: StepDefinition,
  order: OrderDetailsPublic,
  stepIndex: number,
): string {
  if (stepIndex === 0 && order.status === "PENDING_PAYMENT") {
    return "Awaiting Payment";
  }
  if (step.label === "Payment Completed") return "Payment Secured";
  if (step.label === "Brief Submission") {
    const briefShared = Boolean(order.briefSubmittedAt) || order.hasBrief;
    return briefShared ? "Brief Received" : "Awaiting Brief";
  }
  if (step.label === "Awaiting Creator Acceptance") return "Your Review";
  if (step.label === "In Progress") return "Create Content";
  return step.label;
}

function getStepPresentation(
  step: StepDefinition,
  order: OrderDetailsPublic,
): StepPresentation {
  switch (step.label) {
    case "Payment Completed":
      return {
        title: "Payment Secured",
        description:
          "The brand's payment is held securely for this order.",
      };
    case "Brief Submission": {
      const briefShared = Boolean(order.briefSubmittedAt) || order.hasBrief;
      return {
        title: briefShared ? "Brief Received" : "Awaiting Brief",
        description: briefShared
          ? "The brand has shared the brief for this project."
          : "Waiting for the brand to share the brief for this order.",
      };
    }
    case "Awaiting Creator Acceptance":
      return {
        title: "Your Review",
        hint: "Usually within 24 hours",
        description:
          "Review the brief, then accept it to start — or reject it with a reason for the brand.",
      };
    case "Awaiting Shipment":
      return {
        title: "Awaiting Shipment",
        hint: "After acceptance",
        description:
          "The brand ships the product to your address. Mark it received once it arrives.",
      };
    case "In Progress":
      return {
        title: "Create Content",
        hint: "Once you're ready",
        description:
          "Create your content and upload it here for the brand to review.",
      };
    case "Delivered":
      return {
        title: "Delivered",
        description:
          "The brand is reviewing your content. You'll be notified once it's approved or a revision is requested.",
      };
    case "Revision Requested":
      return {
        title: "Revision Requested",
        description:
          "Review the brand's notes and upload your revised content.",
      };
    case "Revision Submitted":
      return {
        title: "Revision Submitted",
        description: "The brand is reviewing your revised content.",
      };
    case "Completed":
      return {
        title: "Completed",
        description:
          "All done — your payout has been released for the approved content.",
      };
    case "Disputed":
      return {
        title: "Disputed",
        description:
          "Our team is reviewing this dispute. You'll be notified when there's an update.",
      };
    case "Cancelled":
      return {
        title: "Cancelled",
        description: "This order was cancelled.",
      };
    default:
      return { title: step.label };
  }
}

function buildSteps(order: OrderDetailsPublic): StepDefinition[] {
  const baseSteps = STEPS.filter((step) => {
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
    return !(
      step.label === "Awaiting Shipment" &&
      !order.requiresPhysicalProductShipment
    );
  }).map((step) => {
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

  if (order.status === "DISPUTED") {
    const preStatus = getPreDisputeStatus(order);
    let insertAfter = baseSteps.findIndex((step) =>
      step.statusMatch.includes(preStatus),
    );
    if (insertAfter < 0) insertAfter = baseSteps.length - 2;
    return [
      ...baseSteps.slice(0, insertAfter + 1),
      DISPUTE_STEP,
      ...baseSteps.slice(insertAfter + 1),
    ];
  }
  if (order.status === "REJECTED" || order.status === "REFUNDED") {
    return insertTerminalStep(baseSteps, order, CANCELLED_STEP);
  }
  return baseSteps;
}

function formatStepDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const time = date
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();
  return `${day}, ${time}`;
}

function getCurrentBadge(
  isAwaitingPayment: boolean,
  isDisputeActive: boolean,
  isCancelledActive: boolean,
) {
  if (isCancelledActive) return { label: "Cancelled", className: "bg-red-500" };
  if (isAwaitingPayment || isDisputeActive) {
    return {
      label: isAwaitingPayment ? "Payment pending" : "Under review",
      className: "bg-amber-500",
    };
  }
  return { label: "Current step", className: "bg-[#E11D48]" };
}

function MobileStepTrack({
  steps,
  order,
  activeIndex,
}: {
  steps: StepDefinition[];
  order: OrderDetailsPublic;
  activeIndex: number;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const activeStep = steps[Math.min(activeIndex, steps.length - 1)];
  const presentation = activeStep
    ? getStepPresentation(activeStep, order)
    : null;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const active = activeRef.current;
    if (!scroller || !active) return;

    const scrollerRect = scroller.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const offset =
      activeRect.left -
      scrollerRect.left -
      (scroller.clientWidth - activeRect.width) / 2;

    scroller.scrollTo({
      left: scroller.scrollLeft + offset,
      behavior: "smooth",
    });
  }, [activeIndex]);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="-mx-1 flex items-start gap-3 overflow-x-auto scroll-smooth px-1 pb-1"
      >
        {steps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const isUpcoming = index > activeIndex;
          const isLast = index === steps.length - 1;
          const isAwaitingPayment =
            order.status === "PENDING_PAYMENT" && index === 0;
          const isDisputeActive =
            order.status === "DISPUTED" && isActive && Boolean(step.disputeStep);
          const isCancelledActive =
            (order.status === "REJECTED" || order.status === "REFUNDED") &&
            isActive &&
            Boolean(step.cancelledStep);
          const Icon = step.icon;
          const label = getStepDisplayLabel(step, order, index);
          const circleClass = cn(
            "relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-white",
            isCompleted && "border-[#E11D48] bg-[#E11D48] text-white",
            isActive &&
              isCancelledActive &&
              "border-red-500 bg-red-500 text-white",
            isActive &&
              !isCancelledActive &&
              (isAwaitingPayment || isDisputeActive) &&
              "border-amber-500 text-amber-600",
            isActive &&
              !isCancelledActive &&
              !isAwaitingPayment &&
              !isDisputeActive &&
              "border-[#E11D48] text-[#E11D48]",
            isUpcoming && "border-neutral-200 text-neutral-400",
          );
          const labelTone = isCancelledActive
            ? "text-red-600"
            : isUpcoming
              ? "text-neutral-400"
              : "text-foreground";

          return (
            <div
              key={step.label}
              ref={isActive ? activeRef : undefined}
              className="relative flex w-[5.75rem] shrink-0 flex-col items-center px-1"
            >
              {!isLast ? (
                <div
                  className={cn(
                    "absolute top-4 left-1/2 z-0 h-0.5 w-[calc(100%+0.75rem)]",
                    isCompleted ? "bg-[#E11D48]" : "bg-neutral-200",
                  )}
                />
              ) : null}
              <div className="relative z-10 flex flex-col items-center">
                <div className={circleClass}>
                  {isCompleted ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1.5 line-clamp-2 text-center text-[11px] font-semibold leading-tight",
                    labelTone,
                  )}
                >
                  {label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {presentation?.description ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-100 bg-white p-3.5 shadow-sm">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Info className="size-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-foreground">
              What happens next?
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
              {presentation.description}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepNode({
  step,
  order,
  index,
  activeIndex,
  isLast,
}: {
  step: StepDefinition;
  order: OrderDetailsPublic;
  index: number;
  activeIndex: number;
  isLast: boolean;
}) {
  const isCompleted = index < activeIndex;
  const isActive = index === activeIndex;
  const isUpcoming = index > activeIndex;
  const isAwaitingPayment = order.status === "PENDING_PAYMENT" && index === 0;
  const isDisputeActive =
    order.status === "DISPUTED" && isActive && Boolean(step.disputeStep);
  const isCancelledActive =
    (order.status === "REJECTED" || order.status === "REFUNDED") &&
    isActive &&
    Boolean(step.cancelledStep);
  const displayLabel = getStepDisplayLabel(step, order, index);
  const Icon = step.icon;
  const dateValue = step.getDate
    ? step.getDate(order)
    : step.dateKey
      ? (order[step.dateKey] as string | null | undefined)
      : null;
  const presentation = getStepPresentation(step, order);
  const badge = getCurrentBadge(
    isAwaitingPayment,
    isDisputeActive,
    isCancelledActive,
  );
  const labelTone = isCancelledActive
    ? "text-red-600"
    : isUpcoming
      ? "text-neutral-500"
      : "text-foreground";
  const circleClass = cn(
    "relative z-10 flex size-10 items-center justify-center rounded-full border-2 bg-white",
    isCompleted && "border-[#E11D48] bg-[#E11D48] text-white",
    isActive && isCancelledActive && "border-red-500 bg-red-500 text-white",
    isActive &&
      !isCancelledActive &&
      (isAwaitingPayment || isDisputeActive) &&
      "border-amber-500 text-amber-600",
    isActive &&
      !isCancelledActive &&
      !isAwaitingPayment &&
      !isDisputeActive &&
      "border-[#E11D48] text-[#E11D48]",
    isUpcoming && "border-neutral-200 text-neutral-400",
  );

  return (
    <div className="relative flex flex-1 flex-col items-center px-2">
      {!isLast ? (
        <div
          className={cn(
            "absolute top-5 left-1/2 z-0 h-0.5 w-full",
            isCompleted ? "bg-[#E11D48]" : "bg-neutral-200",
          )}
        />
      ) : null}

      <div className="flex flex-col items-center">
        <div className={circleClass}>
          {isCompleted ? (
            <Check className="size-5" strokeWidth={2.5} />
          ) : (
            <Icon className="size-4" />
          )}
        </div>
        <p
          className={cn(
            "mt-2 text-center text-[13px] font-semibold leading-tight",
            labelTone,
          )}
        >
          {displayLabel}
        </p>
      </div>

      {isCompleted && dateValue ? (
        <p className="mt-0.5 text-center text-[11px] text-neutral-500">
          {formatStepDate(dateValue)}
        </p>
      ) : null}

      {isActive ? (
        <span
          className={cn(
            "mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      ) : null}

      {isUpcoming && presentation.hint ? (
        <p className="mt-0.5 text-center text-[11px] text-neutral-400">
          {presentation.hint}
        </p>
      ) : null}

      {isActive && presentation.description ? (
        <div className="mt-4 w-full rounded-xl border border-rose-100 bg-white p-3.5 shadow-sm">
          <p className="text-[13px] font-bold text-foreground">
            What happens next?
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
            {presentation.description}
          </p>
        </div>
      ) : null}

      {isUpcoming && presentation.description ? (
        <div className="mt-4 w-full rounded-xl border border-black/5 bg-white/80 p-3">
          <p className="text-[11px] leading-relaxed text-neutral-500">
            {presentation.description}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CreatorOrderProgressStepper({
  order,
}: Readonly<CreatorOrderProgressStepperProps>) {
  const steps = buildSteps(order);
  const activeIndex = getActiveStepIndex(order, steps);

  return (
    <div className="rounded-2xl bg-linear-to-r from-[#FFF1F5] via-white to-[#FFF7FA] p-5 sm:p-7">
      <div className="md:hidden">
        <MobileStepTrack steps={steps} order={order} activeIndex={activeIndex} />
      </div>

      <div className="hidden overflow-x-auto md:block">
        <div className="flex min-w-[860px] items-start">
          {steps.map((step, index) => (
            <StepNode
              key={step.label}
              step={step}
              order={order}
              index={index}
              activeIndex={activeIndex}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
