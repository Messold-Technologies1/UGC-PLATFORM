"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  MessageSquare,
  X,
  XCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";
import { useWithdrawCreatorDisputeMutation } from "../../hooks/use-withdraw-creator-dispute-mutation";

interface CreatorOrderCancelledPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
  previewStepId?: string | null;
  onStepClick?: (id: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  accepted: "Accepted",
  cancelled: "Cancelled",
  product_received: "Product Received",
  in_progress: "In Progress",
  delivered: "Delivered",
  completed: "Completed",
};

function fmtDate(val?: string | null): string {
  if (!val) return "TBD";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(val));
  } catch {
    return "TBD";
  }
}

function fmtDateTime(val?: string | null): string | null {
  if (!val) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(val));
  } catch {
    return null;
  }
}

function fmtEnum(val?: string | string[] | null): string {
  if (!val) return "N/A";
  const arr = Array.isArray(val) ? val : [val];
  if (arr.length === 0) return "N/A";
  return arr
    .map((s) =>
      s
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" "),
    )
    .join(", ");
}

function buildCancelledSteps(order: any): StepDef[] {
  const hasAccepted = Boolean(order?.briefAcceptedAt);

  const ids = hasAccepted
    ? ["accepted", "cancelled", "in_progress", "delivered", "completed"]
    : ["accepted", "cancelled", "in_progress", "delivered", "completed"];

  const dates: Record<string, string | null | undefined> = {
    accepted: order?.briefAcceptedAt ?? order?.paidAt,
    cancelled: order?.refundedAt ?? order?.updatedAt,
    in_progress: null,
    delivered: null,
    completed: null,
  };

  return ids.map((id) => ({
    id,
    label: STEP_LABELS[id],
    status: (id === "accepted" && (hasAccepted || order?.paidAt)
      ? "completed"
      : id === "cancelled"
        ? "cancelled"
        : "pending") as StepDef["status"],
    date: dates[id] ?? null,
  }));
}


function CancellationReasonCard({ order }: { order: any }) {
  const cancelDate = fmtDateTime(order?.refundedAt ?? order?.updatedAt);

  const reason =
    order?.cancellationReason ??
    order?.disputeReason ??
    "No specific reason was provided for this cancellation.";

  const cancelledBy = order?.status === "REJECTED" ? "Brand" : "Admin";

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-3">Cancellation Reason</h3>

      <p className="text-sm text-muted-foreground mb-4">
        The {cancelledBy.toLowerCase()} cancelled this order.
      </p>

      <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-lg p-4">
        <p className="text-xs font-bold text-red-700 dark:text-red-400 mb-1.5 uppercase tracking-wider">
          Reason Provided by {cancelledBy}
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed italic">
          &ldquo;{reason}&rdquo;
        </p>
      </div>

      {cancelDate && (
        <p className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground">
          Cancelled on {cancelDate}
        </p>
      )}
    </div>
  );
}

function CancelledOrderSummaryCard({
  briefData,
  selectedItem,
}: {
  briefData: any;
  selectedItem: any;
}) {
  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Order Summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Video Type</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.contentType?.length
              ? fmtEnum(briefData.brief.contentType)
              : selectedItem.order.packageNameSnapshot || "Not specified"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Key Points</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.keyNoteToInclude ? "Included in Brief" : "None"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Language</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.language || "Not specified"}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
          <span className="text-muted-foreground shrink-0">Deliverables</span>
          <div className="sm:text-right">
            <span className="font-medium text-foreground block">
              1 {selectedItem.order.packageNameSnapshot || "Deliverable"}
            </span>
            <span className="text-xs text-muted-foreground">
              9:16 Aspect Ratio
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="outline"
          className="w-full rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
          asChild
        >
          <Link href={`/creator/orders/${selectedItem.order.id}/brief`}>
            View Full Brief
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DisputeNoticeCard({
  order,
}: {
  order: {
    id: string;
    dispute?: { openedBy?: string; reason?: string };
  };
}) {
  const withdrawMutation = useWithdrawCreatorDisputeMutation();
  const openedByCreator = order?.dispute?.openedBy === "CREATOR";
  const reason = order?.dispute?.reason;

  return (
    <div className="bg-amber-50 dark:bg-amber-500/5 rounded-lg border border-amber-200 dark:border-amber-500/20 p-5 shadow-sm xl:col-span-2 2xl:col-span-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-sm mb-1">Order under dispute</h3>
          <p className="text-sm text-muted-foreground">
            {openedByCreator
              ? "You raised this dispute. Our team is reviewing the case."
              : "The brand raised this dispute. Our team is reviewing the case."}
            {reason ? ` Reason: “${reason}”.` : ""}
          </p>
        </div>
        {openedByCreator && (
          <Button
            variant="outline"
            className="shrink-0"
            disabled={withdrawMutation.isPending}
            onClick={() => withdrawMutation.mutate({ orderId: order.id })}
          >
            {withdrawMutation.isPending ? (
              <>
                <Spinner className="size-4" aria-hidden />
                Withdrawing...
              </>
            ) : (
              "Withdraw dispute"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

function CancelledPayoutCard() {
  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-3">Payout</h3>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        As this order was cancelled, no payout will be processed.
      </p>

      <p className="text-sm text-muted-foreground mb-4">
        If you have questions, feel free to contact support.
      </p>
    </div>
  );
}

export function CreatorOrderCancelledPanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
  previewStepId,
  onStepClick,
}: CreatorOrderCancelledPanelProps) {
  const order = detailsData?.order ?? selectedItem?.order;
  const isDisputed = order?.status === "DISPUTED";

  const steps = useMemo(() => buildCancelledSteps(order), [order]);

  if (!selectedItem) return null;

  return (
    <CreatorOrderPanelLayout
      selectedOrderId={selectedOrderId}
      selectedItem={selectedItem}
      isLoading={isLoading}
      onClose={onClose}
      statusBadgeLabel={isDisputed ? "Disputed" : "Cancelled"}
      statusBadgeColor={
        isDisputed
          ? "bg-amber-500/10 text-amber-600"
          : "bg-red-500/10 text-red-600"
      }
      payoutAmountDisplay="₹0"
      payoutLabelDisplay="No Payout"
      steps={steps}
      dispute={detailsData?.order?.dispute}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        {order?.status === "DISPUTED" ? (
          <DisputeNoticeCard order={order} />
        ) : (
          <CancellationReasonCard order={order} />
        )}
        <CancelledOrderSummaryCard
          briefData={briefData}
          selectedItem={selectedItem}
        />
        <CancelledPayoutCard />
      </div>
    </CreatorOrderPanelLayout>
  );
}
