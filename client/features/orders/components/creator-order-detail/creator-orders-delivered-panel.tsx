"use client";

import { useMemo } from "react";
import {
  Clock,
  Info,
  CheckCircle2,
} from "lucide-react";
import { type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";
import { CreatorDeliveryAssetsCard } from "./creator-delivery-assets-card";
import { DeliveryDeadlineDisplay } from "../delivery-deadline-display";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "../../lib/creator-payout";
import { CreatorPayoutDetailsCard } from "./creator-payout-details-card";

interface CreatorOrderDeliveredPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  detailsData: any;
  briefData: any;
  isLoading: boolean;
  onClose: () => void;
  previewStepId?: string | null;
  onStepClick?: (id: string) => void;
  isOrderCompleted?: boolean;
}

const STEP_LABELS: Record<string, string> = {
  accepted: "Accepted",
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

function buildDeliveredSteps(order: any): StepDef[] {
  const ids = [
    "accepted",
    "product_received",
    "in_progress",
    "delivered",
    "completed",
  ];

  const dates: Record<string, string | null | undefined> = {
    accepted: order?.briefAcceptedAt,
    product_received: order?.productReceivedAt ?? order?.briefAcceptedAt,
    in_progress: order?.productReceivedAt ?? order?.briefAcceptedAt,
    delivered: order?.deliveredAt,
    completed: order?.acceptedAt ?? order?.creatorPaidAt,
  };

  const currentIdx = ids.indexOf("delivered");

  return ids.map((id, i) => ({
    id,
    label: STEP_LABELS[id],
    status: (i < currentIdx
      ? "completed"
      : i === currentIdx
        ? "delivered"
        : "pending") as StepDef["status"],
    date: dates[id] ?? null,
  }));
}


function DeliveredFilesCard({ orderId }: { orderId: string }) {
  return (
    <CreatorDeliveryAssetsCard
      orderId={orderId}
      title="Delivered Files"
      emptyLabel="No delivery files found."
    />
  );
}

function WaitingForApprovalCard({ order }: { order: any }) {
  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-amber-500" />
        </div>
        <h3 className="font-bold text-sm text-foreground">
          Waiting for Brand Approval
        </h3>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        The brand has been notified that the content is ready for review.
      </p>

      <div className="space-y-2 mb-4">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
          What happens next?
        </h4>
        <ul className="space-y-2">
          {[
            "The brand will review your content",
            "They may approve or request changes",
            "You'll be paid once the content is approved",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#4318FF] mt-1.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {order?.deliveredAt && (
        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Delivered
            </span>
          </div>
          <DeliveryDeadlineDisplay
            order={order}
            showBadge={false}
            dateClassName="text-xs font-semibold text-foreground"
          />
        </div>
      )}
    </div>
  );
}

function ContentApprovedCard({ order }: { order: any }) {
  const approvedDate = order?.acceptedAt ? fmtDateTime(order.acceptedAt) : null;

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col justify-center items-center text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h3 className="font-bold text-sm mb-2">Content Approved</h3>
      <p className="text-sm text-muted-foreground">
        The brand has approved your delivered content. This order is now complete.
      </p>
      {approvedDate && (
        <p className="mt-4 pt-3 border-t border-border/40 text-xs text-muted-foreground w-full text-center">
          Approved on {approvedDate}
        </p>
      )}
    </div>
  );
}

function DeliveredOrderSummaryCard({
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
          <span className="text-muted-foreground shrink-0">Tone</span>
          <span className="font-medium text-foreground sm:text-right">
            {briefData?.brief?.toneStyle?.length
              ? fmtEnum(briefData.brief.toneStyle)
              : "Not specified"}
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

export function CreatorOrderDeliveredPanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
  previewStepId,
  onStepClick,
  isOrderCompleted = false,
}: CreatorOrderDeliveredPanelProps) {
  const order = detailsData?.order ?? selectedItem?.order;

  const steps = useMemo(() => buildDeliveredSteps(order), [order]);

  const expectedAmount = getCreatorPayoutFromOrderTotal(
    resolveOrderTotalInr({
      expectedAmountPaise: detailsData?.order?.expectedAmountPaise,
      priceAmountSnapshot:
        detailsData?.order?.priceAmountSnapshot ??
        selectedItem?.order?.priceAmountSnapshot,
    }),
  ).creatorEarnings;

  if (!selectedItem) return null;

  return (
    <CreatorOrderPanelLayout
      selectedOrderId={selectedOrderId}
      selectedItem={selectedItem}
      isLoading={isLoading}
      onClose={onClose}
      statusBadgeLabel="Delivered"
      statusBadgeColor="bg-[#22c55e]/10 text-[#22c55e]"
      expectedAmount={expectedAmount}
      steps={steps}
      dispute={detailsData?.order?.dispute}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        <DeliveredFilesCard orderId={selectedOrderId} />
        {isOrderCompleted ? (
          <ContentApprovedCard order={order} />
        ) : (
          <WaitingForApprovalCard order={order} />
        )}
        <DeliveredOrderSummaryCard
          briefData={briefData}
          selectedItem={selectedItem}
        />
        <CreatorPayoutDetailsCard
          order={order}
          selectedItem={selectedItem}
          detailsData={detailsData}
          showBriefLink={false}
        />
      </div>
    </CreatorOrderPanelLayout>
  );
}
