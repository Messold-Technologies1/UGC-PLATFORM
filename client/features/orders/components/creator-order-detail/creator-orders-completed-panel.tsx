"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Download,
  ExternalLink,
  FileVideo,
  MessageSquare,
  Play,
  Star,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { OrderChatWidget } from "../order-chat-widget";
import { useGetBrandOrderDeliveriesQuery } from "../../hooks/use-get-brand-order-deliveries-query";
import { useGetOrderRatingReviewQuery } from "../../hooks/use-get-order-rating-review-query";
import { useCreateOrderRatingReviewMutation } from "../../hooks/use-create-order-rating-review-mutation";
import { OrderProgressStepper, type StepDef } from "./order-progress-stepper";
import { CreatorOrderPanelLayout } from "./creator-order-panel-layout";

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
  const { data: deliveriesData, isLoading } = useGetBrandOrderDeliveriesQuery(
    orderId,
    {
      enabled: Boolean(orderId),
    },
  );

  const latestDelivery = deliveriesData?.items?.at(-1);
  const videoAsset = latestDelivery?.assets?.find((a) => a.kind === "video");
  const allAssets = latestDelivery?.assets ?? [];
  const submittedDate = fmtDateTime(latestDelivery?.createdAt);

  if (isLoading) {
    return (
      <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
        <h3 className="font-bold text-sm mb-4">Delivered Files</h3>
        <Skeleton className="h-36 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Delivered Files</h3>

      {videoAsset ? (
        <div className="space-y-3">
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black/5 border border-border/40">
            <video
              src={videoAsset.url}
              className="w-full h-full object-cover"
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-foreground ml-0.5" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Final Video</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allAssets.length} asset{allAssets.length !== 1 ? "s" : ""}
              {submittedDate && ` • Delivered on ${submittedDate}`}
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-lg h-9 text-xs font-semibold border-border/50 gap-1.5"
            asChild
          >
            <a href={videoAsset.url} download>
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
            <FileVideo className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            No delivery files found.
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentDetailsCard({
  order,
  selectedItem,
  detailsData,
}: {
  order: any;
  selectedItem: any;
  detailsData: any;
}) {
  const expectedAmount = detailsData?.order?.expectedAmountPaise
    ? detailsData.order.expectedAmountPaise / 100
    : selectedItem?.order?.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

  const addOnsTotal = detailsData?.order?.addOnsTotalSnapshot
    ? parseFloat(detailsData.order.addOnsTotalSnapshot)
    : 0;

  const basePayout = expectedAmount - addOnsTotal;
  const platformFee = 0;
  const paidDate = fmtDate(order?.creatorPaidAt ?? order?.acceptedAt);

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">Payment Details</h3>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base Payout</span>
          <span className="font-medium text-foreground">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(basePayout)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            Add-ons ({detailsData?.order?.addOnsSnapshot?.length || 0})
          </span>
          <span className="font-medium text-foreground">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(addOnsTotal)}
          </span>
        </div>
        <div className="flex justify-between pb-3 border-b border-border/40">
          <span className="text-muted-foreground">Platform Fee</span>
          <span className="font-medium text-foreground">₹0</span>
        </div>
        <div className="flex justify-between items-center pt-1">
          <span className="font-bold text-foreground">Total Paid</span>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg text-[#22c55e]">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(expectedAmount)}
            </span>
            <Badge
              variant="secondary"
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border-0 bg-[#22c55e]/10 text-[#22c55e]"
            >
              Paid
            </Badge>
          </div>
        </div>
      </div>

      <p className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
        Paid on {paidDate}
      </p>
    </div>
  );
}

function RateExperienceCard({
  orderId,
  brandName,
}: {
  orderId: string;
  brandName: string;
}) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  const reviewQuery = useGetOrderRatingReviewQuery(orderId, {
    retry: false,
  });
  const createReviewMutation = useCreateOrderRatingReviewMutation();
  const existingReview = reviewQuery.data ?? null;
  const isSubmitting = createReviewMutation.isPending;

  const displayRating =
    existingReview?.rating ?? (hoveredRating || selectedRating);
  const ratingLabel = RATING_LABELS[displayRating] || "";

  function handleSubmitReview() {
    if (selectedRating < 1 || isSubmitting || existingReview) return;
    createReviewMutation.mutate({
      orderId,
      rating: selectedRating,
    });
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-1">Rate Your Experience</h3>
      <p className="text-xs text-muted-foreground mb-4">
        How was your experience with{" "}
        <span className="font-medium text-foreground">{brandName}</span>?
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
        <div className="space-y-4">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => {
              const value = i + 1;
              const isActive = value <= (hoveredRating || selectedRating);
              return (
                <button
                  key={value}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedRating(value)}
                  onMouseEnter={() => setHoveredRating(value)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-0.5 rounded transition-transform hover:scale-110 disabled:opacity-60"
                  aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                >
                  <Star
                    className={cn(
                      "w-7 h-7 transition-colors",
                      isActive
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/20",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {ratingLabel && (
            <p className="text-sm font-semibold text-amber-600">
              {ratingLabel}
            </p>
          )}

          <Button
            className="w-full rounded-lg h-10 font-bold bg-[#4318FF] hover:bg-[#4318FF]/90 text-white shadow-sm"
            disabled={selectedRating < 1 || isSubmitting}
            onClick={handleSubmitReview}
          >
            {isSubmitting ? (
              <>
                <Spinner className="w-4 h-4" aria-hidden />
                Submitting...
              </>
            ) : (
              "Add Review"
            )}
          </Button>
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
  const chatRef = useRef<HTMLDivElement>(null);

  const order = detailsData?.order ?? selectedItem?.order;

  const steps = useMemo(() => buildCompletedSteps(order), [order]);

  const expectedAmount = detailsData?.order?.expectedAmountPaise
    ? detailsData.order.expectedAmountPaise / 100
    : selectedItem?.order?.priceAmountSnapshot
      ? parseFloat(selectedItem.order.priceAmountSnapshot)
      : 0;

  const isPaid = order?.status === "CREATOR_PAYMENT_DONE";

  function handleContactBrand() {
    chatRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!selectedItem) return null;

  return (
    <CreatorOrderPanelLayout
      selectedOrderId={selectedOrderId}
      selectedItem={selectedItem}
      isLoading={isLoading}
      onClose={onClose}
      statusBadgeLabel="Completed"
      statusBadgeColor="bg-[#22c55e]/10 text-[#22c55e]"
      payoutAmountDisplay={new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(expectedAmount)}
      payoutLabelDisplay={isPaid ? "Paid" : "Payout"}
      steps={steps}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
        <CompletedFilesCard orderId={selectedOrderId} />
        <PaymentDetailsCard
          order={order}
          selectedItem={selectedItem}
          detailsData={detailsData}
        />
        <RateExperienceCard
          orderId={selectedOrderId}
          brandName={selectedItem.brand.brandName}
        />
      </div>
    </CreatorOrderPanelLayout>
  );
}
