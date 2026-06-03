"use client";

import { useMemo } from "react";
import {
  Clock,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";
import { CreatorDeliveryAssetsCard } from "./creator-delivery-assets-card";
interface CreatorOrderDeliveredPanelProps {
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

function daysLeft(deadline?: string | null): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86_400_000));
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
  const deadline = order?.deliveryDeadlineAt;
  const remaining = daysLeft(deadline);

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

      {deadline && (
        <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">
              Deadline
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {fmtDate(deadline)}
            </span>
            {remaining !== null && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border-0",
                  remaining <= 3
                    ? "bg-red-500/10 text-red-600"
                    : remaining <= 7
                      ? "bg-amber-500/10 text-amber-600"
                      : "bg-emerald-500/10 text-emerald-600",
                )}
              >
                {remaining} day{remaining !== 1 ? "s" : ""} left
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveredOrderSummaryCard({
  briefData,
  selectedItem,
  order,
}: {
  briefData: any;
  selectedItem: any;
  order: any;
}) {
  const expectedAmount = order?.expectedAmountPaise
    ? order.expectedAmountPaise / 100
    : selectedItem?.order?.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Order Summary</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Video Type</span>
          <span className="font-medium text-foreground text-right">
            {briefData?.brief?.contentType
              ? fmtEnum(briefData.brief.contentType)
              : "UGC Testimonial"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Key Points</span>
          <span className="font-medium text-foreground text-right">
            {briefData?.brief?.keyNoteToInclude ? "Included in Brief" : "None"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Language</span>
          <span className="font-medium text-foreground text-right">
            {briefData?.brief?.language || "Hindi"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tone</span>
          <span className="font-medium text-foreground text-right">
            {briefData?.brief?.toneStyle
              ? fmtEnum(briefData.brief.toneStyle)
              : "Natural, Authentic"}
          </span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-muted-foreground">Deliverables</span>
          <div className="text-right">
            <span className="font-medium text-foreground block">
              1 {selectedItem.order.packageNameSnapshot || "UGC Video (60s)"}
            </span>
            <span className="text-xs text-muted-foreground">
              9:16 Aspect Ratio
            </span>
          </div>
        </div>
        <div className="flex justify-between pt-3 border-t border-border/40 mt-auto">
          <span className="text-muted-foreground font-medium">Payout</span>
          <span className="font-bold text-foreground">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(expectedAmount)}
          </span>
        </div>
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
}: CreatorOrderDeliveredPanelProps) {
  const order = detailsData?.order ?? selectedItem?.order;

  const steps = useMemo(() => buildDeliveredSteps(order), [order]);

  const expectedAmount = detailsData?.order?.expectedAmountPaise
    ? detailsData.order.expectedAmountPaise / 100
    : selectedItem?.order?.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

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
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        <DeliveredFilesCard orderId={selectedOrderId} />
        <WaitingForApprovalCard order={order} />
        <DeliveredOrderSummaryCard
          briefData={briefData}
          selectedItem={selectedItem}
          order={order}
        />
      </div>
    </CreatorOrderPanelLayout>
  );
}
