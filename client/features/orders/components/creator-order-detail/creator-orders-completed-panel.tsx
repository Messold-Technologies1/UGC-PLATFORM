"use client";

import { useMemo } from "react";

import { Star } from "lucide-react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useGetOrderRatingReviewQuery } from "../../hooks/use-get-order-rating-review-query";
import type { StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";
import { CreatorDeliveryAssetsCard } from "./creator-delivery-assets-card";
import {
  formatCreatorPayoutInr,
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "../../lib/creator-payout";
import { CreatorPayoutDetailsCard } from "./creator-payout-details-card";

interface CreatorOrderCompletedPanelProps {
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

const RATING_LABELS = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];

function buildCompletedSteps(order: any): StepDef[] {
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

  return ids.map((id) => ({
    id,
    label: STEP_LABELS[id],
    status: "completed" as StepDef["status"],
    date: dates[id] ?? null,
  }));
}

function CompletedFilesCard({ orderId }: { orderId: string }) {
  return (
    <CreatorDeliveryAssetsCard
      orderId={orderId}
      title="Delivered Files"
      emptyLabel="No delivery files found."
    />
  );
}

function BrandReviewCard({
  orderId,
  brandName,
}: {
  orderId: string;
  brandName: string;
}) {
  const reviewQuery = useGetOrderRatingReviewQuery(orderId, {
    retry: false,
  });
  const existingReview = reviewQuery.data ?? null;

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-1">Brand's Review</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Feedback from{" "}
        <span className="font-medium text-foreground">{brandName}</span>
      </p>

      {reviewQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="w-4 h-4" aria-hidden />
          Loading...
        </div>
      ) : existingReview ? (
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-7 h-7",
                  i < existingReview.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/20",
                )}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-[#22c55e]">
            {RATING_LABELS[existingReview.rating]}
          </p>
          {existingReview.review && (
            <p className="text-sm text-muted-foreground">
              {existingReview.review}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 py-4 text-center">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
            <Star className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">No review yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            The brand hasn't left a review for this order.
          </p>
        </div>
      )}
    </div>
  );
}

export function CreatorOrderCompletedPanel({
  selectedOrderId,
  selectedItem,
  detailsData,
  briefData,
  isLoading,
  onClose,
  previewStepId,
  onStepClick,
}: CreatorOrderCompletedPanelProps) {
  const order = detailsData?.order ?? selectedItem?.order;

  const steps = useMemo(() => buildCompletedSteps(order), [order]);

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
      statusBadgeLabel="Completed"
      statusBadgeColor="bg-[#22c55e]/10 text-[#22c55e]"
      payoutAmountDisplay={formatCreatorPayoutInr(expectedAmount)}
      payoutLabelDisplay="Payout"
      steps={steps}
      dispute={detailsData?.order?.dispute}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        <CompletedFilesCard orderId={selectedOrderId} />
        <CreatorPayoutDetailsCard
          order={order}
          selectedItem={selectedItem}
          detailsData={detailsData}
        />
        <BrandReviewCard
          orderId={selectedOrderId}
          brandName={selectedItem.brand.brandName}
        />
      </div>
    </CreatorOrderPanelLayout>
  );
}
