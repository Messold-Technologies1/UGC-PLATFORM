"use client";

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

const TIMELINE_STEPS = [
  {
    id: "accepted",
    label: "Order Accepted",
    desc: "11 May 2025, 10:20 AM",
    status: "completed",
  },
  {
    id: "shipped",
    label: "Product Shipped",
    desc: "Waiting for brand to ship the product",
    status: "current",
  },
  {
    id: "received",
    label: "Product Received",
    desc: "Mark the product as received to get started",
    status: "pending",
  },
  {
    id: "progress",
    label: "In Progress",
    desc: "Start creating your content",
    status: "pending",
  },
  {
    id: "delivered",
    label: "Delivered",
    desc: "Submit the final content for review",
    status: "pending",
  },
  {
    id: "completed",
    label: "Completed",
    desc: "Get paid after approval",
    status: "pending",
  },
];

interface CreatorOrdersDetailsPanelProps {
  selectedOrderId: string;
  selectedItem: any;
  onClose: () => void;
  activeTab: string;
}

export function CreatorOrdersDetailsPanel({
  selectedOrderId,
  selectedItem,
  onClose,
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
                {selectedItem.brand.brandName
                  .substring(0, 1)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-base">
                {selectedItem.brand.brandName}
              </h3>
              <p className="text-xs text-muted-foreground">
                Skincare • Product Demo
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-lg h-9 text-xs font-semibold gap-1.5 border-border/50 text-primary hover:text-primary"
            asChild
          >
            <Link href={`/creator/orders/${selectedOrderId}/brief`}>
              View Brief <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Video Type</span>
                <span className="font-medium text-foreground text-right">
                  {selectedItem.order.packageNameSnapshot ||
                    "UGC Video (60s)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Style</span>
                <span className="font-medium text-foreground text-right">
                  {briefData?.brief?.toneStyle?.join(", ") || "Standard"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Key Points</span>
                <span className="font-medium text-foreground text-right">
                  {briefData?.brief?.keyNoteToInclude
                    ? "Included in Brief"
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Add-ons</span>
                <div className="flex gap-1.5 flex-wrap justify-end">
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
                    <span className="text-muted-foreground text-xs">
                      None
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between pt-3">
                <span className="text-muted-foreground">
                  Total Payout
                </span>
                <span className="font-bold text-foreground text-right">
                  {detailsData?.order?.expectedAmountPaise && detailsData.order.expectedAmountPaise > 0
                    ? new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(detailsData.order.expectedAmountPaise / 100)
                    : selectedItem.order.priceAmountSnapshot && parseFloat(selectedItem.order.priceAmountSnapshot) > 0
                      ? new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          maximumFractionDigits: 0,
                        }).format(parseFloat(selectedItem.order.priceAmountSnapshot))
                      : "₹0"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-sm">Timeline</h4>
          <div className="relative space-y-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
            {TIMELINE_STEPS.map((step, idx) => {
              let label = step.label;
              let desc = step.desc;
              let status = step.status;

              if (step.id === "accepted") {
                label = "Brief Accepted";
                if (briefData?.briefAcceptedAt) {
                  desc = new Intl.DateTimeFormat("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(briefData.briefAcceptedAt));
                  status = "completed";
                } else {
                  desc = "Waiting for brief to be accepted";
                  status = "pending";
                }
              }

              return (
                <div
                  key={step.id}
                  className="relative flex items-start pl-8"
                >
                  <div className="absolute left-0 top-0.5 flex items-center justify-center bg-background ring-4 ring-background rounded-full">
                    {status === "completed" ? (
                      <div className="w-5 h-5 rounded-md bg-[#4318FF] flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
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
                        status === "completed"
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                    <span className="text-[11px] text-muted-foreground leading-snug">
                      {desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-5 border-t border-border/40 flex items-center gap-3 bg-accent/20 mt-auto">
        <Button
          variant="outline"
          className="flex-1 rounded-lg h-11 font-semibold border-border/60 bg-background"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Message Brand
        </Button>
        <Button
          asChild
          className="flex-1 rounded-lg h-11 font-bold bg-[#4318FF] hover:bg-[#4318FF]/90 text-white shadow-md"
        >
          <Link href={`/creator/orders/${selectedOrderId}`}>
            View Order Details
          </Link>
        </Button>
      </div>
    </div>
  );
}
