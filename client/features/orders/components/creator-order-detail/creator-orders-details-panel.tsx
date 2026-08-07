"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, X, ExternalLink, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "../../constants";
import { cn } from "@/lib/utils";
import { useGetCreatorOrderDetailsQuery } from "../../hooks/use-get-creator-order-details-query";
import { useGetOrderBriefQuery } from "../../hooks/use-get-order-brief-query";
import { CreatorOrderNewRequestPanel } from "./creator-orders-new-request-panel";
import { CreatorOrderActivePanel } from "./creator-orders-active-panel";
import { CreatorOrderRevisionPanel } from "./creator-orders-revision-panel";
import { CreatorOrderDeliveredPanel } from "./creator-orders-delivered-panel";
import { CreatorOrderCompletedPanel } from "./creator-orders-completed-panel";
import { CreatorOrderCancelledPanel } from "./creator-orders-cancelled-panel";
import { CreatorOrderDisputePanel } from "./creator-orders-dispute-panel";
import {
  formatCreatorPayoutInr,
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "../../lib/creator-payout";

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

function formatTs(ts: string | Date | null | undefined): string | null {
  if (!ts) return null;
  return new Intl.DateTimeFormat("en-GB", DATE_FMT).format(new Date(ts));
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

interface TimelineStep {
  id: string;
  label: string;
  desc: string;
  status: "completed" | "current" | "pending";
}

function buildTimelineSteps(
  order:
    | {
        status?: string;
        briefAcceptedAt?: string | null;
        requiresPhysicalProductShipment?: boolean;
        dispatchedAt?: string | null;
        productReceivedAt?: string | null;
        deliveredAt?: string | null;
        acceptedAt?: string | null;
        creatorPaidAt?: string | null;
        revisionCount?: number;
      }
    | null
    | undefined,
  briefData:
    | {
        briefAcceptedAt?: string | null;
      }
    | null
    | undefined,
): TimelineStep[] {
  const acceptedAt = order?.briefAcceptedAt ?? briefData?.briefAcceptedAt;
  const requiresShipment = order?.requiresPhysicalProductShipment ?? false;

  const steps: TimelineStep[] = [];

  steps.push({
    id: "accepted",
    label: "Brief Accepted",
    desc: acceptedAt
      ? formatTs(acceptedAt)!
      : "Waiting for brief to be accepted",
    status: acceptedAt ? "completed" : "pending",
  });

  if (requiresShipment) {
    steps.push({
      id: "shipped",
      label: "Product Shipped",
      desc: order?.dispatchedAt
        ? formatTs(order.dispatchedAt)!
        : "Waiting for brand to ship the product",
      status: order?.dispatchedAt ? "completed" : "pending",
    });

    steps.push({
      id: "received",
      label: "Product Received",
      desc: order?.productReceivedAt
        ? formatTs(order.productReceivedAt)!
        : "Mark the product as received to get started",
      status: order?.productReceivedAt ? "completed" : "pending",
    });
  }

  const inProgressReached = requiresShipment
    ? Boolean(order?.productReceivedAt)
    : Boolean(acceptedAt);
  steps.push({
    id: "progress",
    label: "In Progress",
    desc: inProgressReached
      ? "Creating content…"
      : "Start creating your content",
    status: inProgressReached ? "completed" : "pending",
  });

  steps.push({
    id: "delivered",
    label: "Delivered",
    desc: order?.deliveredAt
      ? formatTs(order.deliveredAt)!
      : "Submit the content for review",
    status: order?.deliveredAt ? "completed" : "pending",
  });

  const revisionStatuses = ["REVISION_REQUESTED", "REVISION_SUBMITTED"];
  const hasRevision =
    (order?.revisionCount && order.revisionCount > 0) ||
    revisionStatuses.includes(order?.status ?? "");
  if (hasRevision) {
    const revisionDone =
      order?.status === "REVISION_SUBMITTED" ||
      (!revisionStatuses.includes(order?.status ?? "") && order?.deliveredAt);
    steps.push({
      id: "revision",
      label: "Revision Requested",
      desc: revisionDone
        ? `Revision submitted (${order?.revisionCount ?? 1} revision${(order?.revisionCount ?? 1) > 1 ? "s" : ""})`
        : "Brand requested changes to your content",
      status: revisionDone ? "completed" : "pending",
    });
  }

  const completedAt = order?.acceptedAt ?? order?.creatorPaidAt;
  steps.push({
    id: "completed",
    label: "Completed",
    desc: completedAt ? formatTs(completedAt)! : "Get paid after approval",
    status: completedAt ? "completed" : "pending",
  });

  if (acceptedAt) {
    const firstPendingIdx = steps.findIndex((s) => s.status === "pending");
    if (firstPendingIdx !== -1) {
      steps[firstPendingIdx].status = "current";
    }
  }

  return steps;
}

interface CreatorOrdersDetailsPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  onClose: () => void;
  onTabChange: (tabId: string, selectOrderId?: string) => void;
  activeTab: string;
}

export function CreatorOrdersDetailsPanel({
  selectedOrderId,
  selectedItem,
  onClose,
  onTabChange,
  activeTab,
}: CreatorOrdersDetailsPanelProps) {
  const { data: detailsData, isLoading: isLoadingDetails } =
    useGetCreatorOrderDetailsQuery(selectedOrderId, {
      enabled: Boolean(selectedOrderId),
    });

  const { data: briefData, isLoading: isLoadingBrief } = useGetOrderBriefQuery(
    selectedOrderId,
    { enabled: Boolean(selectedOrderId) },
  );

  const [previewStepId, setPreviewStepId] = useState<string | null>(null);

  useEffect(() => {
    setPreviewStepId(null);
  }, [selectedOrderId, activeTab]);

  const isLoadingRightPanel = isLoadingDetails || isLoadingBrief;

  if (!selectedItem) return null;

  if (activeTab === "new") {
    return (
      <CreatorOrderNewRequestPanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        onAccepted={() => onTabChange("active", selectedOrderId)}
      />
    );
  }

  const orderStatus = selectedItem?.order?.status as string;

  let effectiveStatus = orderStatus;
  if (previewStepId) {
    switch (previewStepId) {
      case "accepted":
      case "awaiting_shipment":
      case "product_received":
      case "in_progress":
        effectiveStatus = "PRODUCT_RECEIVED";
        break;
      case "revision_requested":
        effectiveStatus = "REVISION_REQUESTED";
        break;
      case "delivered":
        effectiveStatus = "DELIVERED";
        break;
      case "completed":
        effectiveStatus = "ACCEPTED";
        break;
      case "cancelled":
        effectiveStatus = "REJECTED";
        break;
    }
  }

  const REVISION_STATUSES = ["REVISION_REQUESTED"];
  const DELIVERED_STATUSES = ["DELIVERED", "REVISION_SUBMITTED"];
  const COMPLETED_STATUSES = ["ACCEPTED", "CREATOR_PAYMENT_DONE"];
  const CANCELLED_STATUSES = ["REJECTED", "REFUNDED"];
  const isOrderCompleted = COMPLETED_STATUSES.includes(orderStatus);

  if (activeTab !== "all") {
    if (activeTab === "dispute" || effectiveStatus === "DISPUTED") {
      return (
        <CreatorOrderDisputePanel
          selectedOrderId={selectedOrderId}
          selectedItem={selectedItem}
          detailsData={detailsData}
          briefData={briefData}
          isLoading={isLoadingRightPanel}
          onClose={onClose}
          previewStepId={previewStepId}
          onStepClick={setPreviewStepId}
        />
      );
    }

    if (
      activeTab === "revisions" ||
      REVISION_STATUSES.includes(effectiveStatus)
    ) {
      return (
        <CreatorOrderRevisionPanel
          selectedOrderId={selectedOrderId}
          selectedItem={selectedItem}
          detailsData={detailsData}
          briefData={briefData}
          isLoading={isLoadingRightPanel}
          onClose={onClose}
          previewStepId={previewStepId}
          onStepClick={setPreviewStepId}
          isOrderCompleted={isOrderCompleted}
        />
      );
    }

    if (
      activeTab === "delivered" ||
      DELIVERED_STATUSES.includes(effectiveStatus)
    ) {
      return (
        <CreatorOrderDeliveredPanel
          selectedOrderId={selectedOrderId}
          selectedItem={selectedItem}
          detailsData={detailsData}
          briefData={briefData}
          isLoading={isLoadingRightPanel}
          onClose={onClose}
          previewStepId={previewStepId}
          onStepClick={setPreviewStepId}
          isOrderCompleted={isOrderCompleted}
        />
      );
    }

    if (
      activeTab === "completed" ||
      COMPLETED_STATUSES.includes(effectiveStatus)
    ) {
      return (
        <CreatorOrderCompletedPanel
          selectedOrderId={selectedOrderId}
          selectedItem={selectedItem}
          detailsData={detailsData}
          briefData={briefData}
          isLoading={isLoadingRightPanel}
          onClose={onClose}
          previewStepId={previewStepId}
          onStepClick={setPreviewStepId}
        />
      );
    }

    if (
      activeTab === "cancelled" ||
      CANCELLED_STATUSES.includes(effectiveStatus)
    ) {
      return (
        <CreatorOrderCancelledPanel
          selectedOrderId={selectedOrderId}
          selectedItem={selectedItem}
          detailsData={detailsData}
          briefData={briefData}
          isLoading={isLoadingRightPanel}
          onClose={onClose}
          previewStepId={previewStepId}
          onStepClick={setPreviewStepId}
        />
      );
    }

    return (
      <CreatorOrderActivePanel
        selectedOrderId={selectedOrderId}
        selectedItem={selectedItem}
        detailsData={detailsData}
        briefData={briefData}
        isLoading={isLoadingRightPanel}
        onClose={onClose}
        previewStepId={previewStepId}
        onStepClick={setPreviewStepId}
        isOrderCompleted={isOrderCompleted}
      />
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-fit sticky top-24">
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-lg">
            Order #{selectedItem.order.id.substring(0, 5).toUpperCase()}
          </h2>
          <Badge
            variant="secondary"
            className={cn(
              "text-[11px] font-bold px-2 py-0.5",
              STATUS_COLORS[selectedItem.order.status as string] ||
                "bg-muted text-muted-foreground",
            )}
          >
            {STATUS_LABELS[
              selectedItem.order.status as keyof typeof STATUS_LABELS
            ] || selectedItem.order.status}
          </Badge>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32]">
              <AvatarImage
                src={selectedItem.brand.logoUrl || undefined}
                className="object-cover rounded-lg"
              />
              <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                {selectedItem.brand.brandName.substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-base">
                {selectedItem.brand.brandName}
              </h3>
              <p className="text-xs text-muted-foreground">
                {briefData?.brief?.industry && briefData?.brief?.contentType?.length
                  ? `${briefData.brief.industry} • ${fmtEnum(briefData.brief.contentType)}`
                  : "Order Details"}
              </p>
            </div>
          </div>
          {selectedItem.order.status !== "BRIEF_SUBMISSION_PENDING" && (
            <Button
              variant="outline"
              className="rounded-lg h-9 text-xs font-semibold gap-1.5 border-border/50 text-primary hover:text-primary"
              asChild
            >
              <Link href={`/creator/orders/${selectedOrderId}/brief`}>
                View Brief <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-sm">Order Summary</h4>
          {isLoadingRightPanel ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-full mt-4" />
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                <span className="text-muted-foreground shrink-0">Video Type</span>
                <span className="font-medium text-foreground sm:text-right">
                  {selectedItem.order.packageNameSnapshot || "Not specified"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                <span className="text-muted-foreground shrink-0">Style</span>
                <span className="font-medium text-foreground sm:text-right">
                  {briefData?.brief?.toneStyle?.length
                    ? fmtEnum(briefData.brief.toneStyle)
                    : "Not specified"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4">
                <span className="text-muted-foreground shrink-0">Key Points</span>
                <span className="font-medium text-foreground sm:text-right">
                  {briefData?.brief?.keyNoteToInclude
                    ? "Included in Brief"
                    : "None"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 pt-1">
                <span className="text-muted-foreground shrink-0">Add-ons</span>
                <div className="flex gap-1.5 flex-wrap sm:justify-end mt-1 sm:mt-0">
                  {detailsData?.order?.addOnsSnapshot &&
                  detailsData.order.addOnsSnapshot.length > 0 ? (
                    detailsData.order.addOnsSnapshot.map((addon: any) => (
                      <span
                        key={addon.id}
                        className="bg-muted px-2 py-0.5 rounded-md text-[10px] font-semibold text-foreground/80"
                      >
                        {addon.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 pt-3 border-t border-border/40 mt-auto">
                <span className="text-muted-foreground">Total Payout</span>
                <span className="font-bold text-foreground text-right">
                  {formatCreatorPayoutInr(
                    getCreatorPayoutFromOrderTotal(
                      resolveOrderTotalInr({
                        expectedAmountPaise:
                          detailsData?.order?.expectedAmountPaise,
                        priceAmountSnapshot:
                          detailsData?.order?.priceAmountSnapshot ??
                          selectedItem.order.priceAmountSnapshot,
                      }),
                    ).creatorEarnings,
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-sm">Timeline</h4>
          <div className="relative space-y-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
            {buildTimelineSteps(detailsData?.order, briefData).map((step) => (
              <div key={step.id} className="relative flex items-start pl-8">
                <div className="absolute left-0 top-0.5 flex items-center justify-center bg-background ring-4 ring-background rounded-full">
                  {step.status === "completed" ? (
                    <div className="w-5 h-5 rounded-md bg-[#4318FF] flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  ) : step.status === "current" ? (
                    <div className="w-5 h-5 rounded-full bg-[#4318FF]/20 flex items-center justify-center ring-2 ring-[#4318FF]/40">
                      <div className="w-2 h-2 rounded-full bg-[#4318FF]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm font-semibold mb-0.5",
                      step.status === "completed"
                        ? "text-foreground"
                        : step.status === "current"
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-snug">
                    {step.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-border/40 flex items-center gap-3 bg-accent/20 mt-auto">
        <Button
          variant="outline"
          className="flex-1 rounded-lg h-11 font-semibold border-border/60 bg-background"
          asChild
        >
          <Link href={`/creator/messages?orderId=${selectedOrderId}`}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Brand
          </Link>
        </Button>
      </div>
    </div>
  );
}
