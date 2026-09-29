"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  MessageCircle,
  MessageSquare,
  Package,
  Star,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ContactSupportButton } from "@/components/contact-support-dialog";
import { brandDisplayName } from "@/features/brands/lib/brand-display";

import { useGetCreatorOrderDetailsQuery } from "../../hooks/use-get-creator-order-details-query";
import { useGetOrderBriefQuery } from "../../hooks/use-get-order-brief-query";
import { useAcceptBriefMutation } from "../../hooks/use-accept-brief-mutation";
import { useRejectBriefMutation } from "../../hooks/use-reject-brief-mutation";
import { useMarkProductReceivedMutation } from "../../hooks/use-mark-product-received-mutation";
import { useWithdrawCreatorDisputeMutation } from "../../hooks/use-withdraw-creator-dispute-mutation";
import { useGetOrderRatingReviewQuery } from "../../hooks/use-get-order-rating-review-query";

import { ReasonPromptDialog } from "../reason-prompt-dialog";
import { RaiseDisputeButton } from "../raise-dispute-button";
import { DeliveryDeadlineDisplay } from "../delivery-deadline-display";
import { DisputeResolvedBanner } from "../dispute-resolved-banner";
import { OrderChatWidget } from "@/features/orders/components/order-chat-widget";
import { BriefSummaryCard } from "../brand-order-detail/brief-summary-card";

import { CreatorOrderProgressStepper } from "./creator-order-progress-stepper";
import { CreatorOrderActivityTimeline } from "./creator-order-activity-timeline";
import { CreatorOrderSummaryCard } from "./creator-order-summary-card";
import { CreatorContentUploadCard } from "./creator-content-upload-card";
import type {
  OrderBrandSnapshot,
  OrderDetailsPublic,
} from "../../api/types";

interface CreatorOrderDetailsViewProps {
  orderId: string;
}

const RATING_LABELS = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];

type CreatorPhase =
  | "new_request"
  | "awaiting_shipment"
  | "in_progress"
  | "revision"
  | "delivered"
  | "completed"
  | "cancelled"
  | "disputed";

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

function resolvePhase(order: OrderDetailsPublic): CreatorPhase {
  const status = order.status;
  const ship = Boolean(order.requiresPhysicalProductShipment);

  if (["BRIEF_SUBMISSION_PENDING", "BRIEF_SUBMITTED"].includes(status)) {
    return "new_request";
  }
  if (status === "DISPUTED") return "disputed";
  if (["REJECTED", "REFUNDED", "CANCELLED_CREDITED"].includes(status))
    return "cancelled";
  if (status === "REVISION_REQUESTED") return "revision";
  if (["DELIVERED", "REVISION_SUBMITTED"].includes(status)) return "delivered";
  if (["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(status)) return "completed";
  if (ship && ["BRIEF_ACCEPTED", "PRODUCT_SHIPPED"].includes(status)) {
    return "awaiting_shipment";
  }
  return "in_progress";
}


/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

function CreatorOrderHeader({
  order,
  brand,
  showMessageBrand = false,
}: {
  order: OrderDetailsPublic;
  brand: OrderBrandSnapshot;
  showMessageBrand?: boolean;
}) {
  const displayId = order.id.slice(0, 8).toUpperCase();
  const placedOn = fmtDateTime(order.paidAt ?? order.createdAt);

  function handleCopy() {
    navigator.clipboard
      .writeText(order.id)
      .then(() => toast.success("Order ID copied to clipboard"))
      .catch(() => toast.error("Failed to copy order ID"));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
        <Link
          href="/creator/orders"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
          Back to Orders
        </Link>

        <span className="hidden sm:inline text-muted-foreground/40 text-sm">
          /
        </span>

        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h1 className="text-xl font-bold tracking-tight whitespace-nowrap">
            Order #{displayId}
          </h1>
          <button
            type="button"
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted shrink-0"
            aria-label="Copy order ID"
          >
            <Copy className="size-4" />
          </button>
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {brandDisplayName(brand.brandName)}
            {placedOn ? ` • Placed on ${placedOn}` : ""}
          </p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ContactSupportButton
            className="h-10 w-full shrink-0 rounded-xl border-primary/30 text-primary hover:bg-primary/5 hover:text-primary px-4 text-sm font-medium sm:w-auto"
            defaultSubject="Order support"
          >
            <MessageCircle className="size-4" />
            Need Help
          </ContactSupportButton>
          <RaiseDisputeButton
            orderId={order.id}
            order={order}
            role="creator"
            className="w-full sm:w-auto"
          />
        </div>
        {showMessageBrand ? (
          <Button
            variant="outline"
            className="h-10 w-full rounded-xl px-4 text-sm font-medium lg:hidden"
            asChild
          >
            <Link
              href={`/creator/messages?orderId=${order.id}`}
              className="flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="size-4" />
              Message Brand
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status banner + phase actions                                              */
/* -------------------------------------------------------------------------- */

const VARIANT_STYLES = {
  info: "bg-background border-border shadow-sm",
  warning:
    "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20",
  success:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  neutral: "bg-muted/50 border-border",
} as const;

const ICON_STYLES = {
  info: "bg-primary/10 text-primary dark:bg-primary/20",
  warning: "bg-background/80 text-amber-600 dark:text-amber-400",
  success: "bg-background/80 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-background/80 text-muted-foreground",
} as const;

function CreatorStatusBanner({
  order,
  brand,
  phase,
}: {
  order: OrderDetailsPublic;
  brand: OrderBrandSnapshot;
  phase: CreatorPhase;
}) {
  const brandLabel = brandDisplayName(brand.brandName);
  const markReceivedMutation = useMarkProductReceivedMutation({
    onSuccess: () =>
      toast.success("Product marked as received — you can start creating!"),
  });
  const withdrawDisputeMutation = useWithdrawCreatorDisputeMutation();

  let icon: React.ElementType = Info;
  let title = "";
  let description = "";
  let variant: keyof typeof VARIANT_STYLES = "info";
  let action: React.ReactNode = null;

  switch (phase) {
    case "new_request":
      return null;
    case "awaiting_shipment":
      if (order.status !== "PRODUCT_SHIPPED") {
        return null;
      }
      icon = Truck;
      variant = "info";
      title = "Product shipped to you";
      description = `${brandLabel} has shipped the product. Mark it as received once it arrives to start creating.`;
      action = (
        <Button
          className="h-10 shrink-0 rounded-xl bg-[#22c55e] px-5 font-semibold text-white shadow-sm hover:bg-[#22c55e]/90"
          disabled={markReceivedMutation.isPending}
          onClick={() =>
            markReceivedMutation.mutate({ orderId: order.id })
          }
        >
          {markReceivedMutation.isPending ? (
            <Spinner className="size-4" aria-hidden />
          ) : (
            <Package className="size-4" />
          )}
          {markReceivedMutation.isPending
            ? "Confirming..."
            : "Mark Product Received"}
        </Button>
      );
      break;
    case "in_progress":
      return null;
    case "revision":
      icon = AlertCircle;
      variant = "warning";
      title = "Revision requested";
      description = `${brandLabel} has requested a revision. Review the notes below and upload your revised content.`;
      break;
    case "delivered":
      icon = CheckCircle2;
      variant = "success";
      title = "Content delivered";
      description = `Your content has been sent to ${brandLabel} for review. You'll be notified once it's approved or a revision is requested.`;
      break;
    case "completed":
      icon = Star;
      variant = "success";
      title = "Order completed";
      description =
        "This order is complete. Your payout has been released for the approved content. Great work!";
      break;
    case "cancelled":
      icon = XCircle;
      variant = order.status === "REFUNDED" ? "neutral" : "warning";
      title =
        order.cancelledBy === "CREATOR"
          ? "Order rejected"
          : "Order cancelled";
      description =
        order.cancelledBy === "CREATOR"
          ? "You rejected this order. No payout will be processed."
          : `This order was cancelled${
              order.cancellationReason
                ? `: "${order.cancellationReason}"`
                : ""
            }. No payout will be processed.`;
      break;
    case "disputed":
      icon = AlertTriangle;
      variant = "warning";
      title = "Order under dispute";
      description = order.dispute
        ? order.dispute.openedBy === "CREATOR"
          ? `You raised this dispute: "${order.dispute.reason}". Our team is reviewing the case.`
          : `${brandLabel} raised this dispute: "${order.dispute.reason}". Our team is reviewing the case.`
        : "This order is currently under dispute. Our team is reviewing the case.";
      if (order.dispute?.openedBy === "CREATOR") {
        action = (
          <Button
            variant="outline"
            className="h-10 shrink-0 rounded-xl"
            disabled={withdrawDisputeMutation.isPending}
            onClick={() =>
              withdrawDisputeMutation.mutate({ orderId: order.id })
            }
          >
            {withdrawDisputeMutation.isPending ? (
              <>
                <Spinner className="size-4" aria-hidden />
                Withdrawing...
              </>
            ) : (
              "Withdraw dispute"
            )}
          </Button>
        );
      }
      break;
  }

  const Icon = icon;

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-4 rounded-xl border px-6 py-5 sm:flex-row sm:items-center sm:justify-between",
          VARIANT_STYLES[variant],
        )}
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full",
              ICON_STYLES[variant],
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="mt-0.5">
            <p className="text-[15px] font-bold text-foreground">{title}</p>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>

        {action}
      </div>
    </>
  );
}

function BriefDecisionActions({ orderId }: Readonly<{ orderId: string }>) {
  const acceptMutation = useAcceptBriefMutation();
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const rejectMutation = useRejectBriefMutation({
    onSuccess: () => setIsRejectOpen(false),
  });
  const busy = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button
          variant="outline"
          className="h-10 rounded-xl border-red-200 px-3 font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 sm:px-4"
          disabled={busy}
          onClick={() => setIsRejectOpen(true)}
        >
          <XCircle className="size-4" />
          Reject
        </Button>
        <Button
          className="h-10 rounded-xl bg-emerald-600 px-3 font-semibold text-white shadow-sm hover:bg-emerald-700 sm:px-5"
          disabled={busy}
          onClick={() => acceptMutation.mutate({ orderId })}
        >
          {acceptMutation.isPending ? (
            <Spinner className="size-4" aria-hidden />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          <span className="sm:hidden">
            {acceptMutation.isPending ? "Accepting..." : "Accept"}
          </span>
          <span className="hidden sm:inline">
            {acceptMutation.isPending ? "Accepting..." : "Accept Order"}
          </span>
        </Button>
      </div>
      <ReasonPromptDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Reject this order?"
        description="The brand will be notified that you've declined this order, along with your reason. This can't be undone."
        label="Reason for rejecting"
        placeholder="Let the brand know why you're rejecting this order…"
        confirmLabel="Reject Order"
        pendingLabel="Rejecting..."
        isPending={rejectMutation.isPending}
        onConfirm={(note) => rejectMutation.mutate({ orderId, note })}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Phase content cards                                                        */
/* -------------------------------------------------------------------------- */

function ShippingDetailsCard({ order }: { order: OrderDetailsPublic }) {
  const hasShippingDetails = Boolean(order.dispatchedAt || order.courierName);

  function handleCopyTrackingId() {
    if (order.trackingId) {
      navigator.clipboard.writeText(order.trackingId);
      toast.success("Tracking ID copied to clipboard!");
    }
  }

  return (
    <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Truck className="size-5" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Shipping Details</h3>
      </div>

      {hasShippingDetails ? (
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Courier partner</span>
            <span className="font-medium text-foreground">
              {order.courierName || "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Tracking ID</span>
            <div className="flex items-center gap-1.5">
              <span className="max-w-[160px] truncate font-mono text-xs font-medium">
                {order.trackingId || "N/A"}
              </span>
              {order.trackingId && (
                <button
                  type="button"
                  onClick={handleCopyTrackingId}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                  aria-label="Copy tracking ID"
                >
                  <Copy className="size-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Shipped on</span>
            <span className="font-medium text-foreground">
              {fmtDate(order.dispatchedAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">ETA</span>
            <DeliveryDeadlineDisplay
              order={order}
              dateClassName="font-medium text-foreground"
              showBadge={false}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 py-8 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-amber-500/10">
            <Truck className="size-5 text-amber-500" />
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Waiting for the brand to ship the product to your address. You&apos;ll
            see tracking details here once it&apos;s on the way.
          </p>
        </div>
      )}
    </div>
  );
}

function RevisionNotesBanner({ order }: { order: OrderDetailsPublic }) {
  const noteText = order.currentRevision?.note?.trim();
  const isStaticFallback =
    noteText ===
    "Please review the brand's feedback in the chat and make the requested changes.";
  const notes =
    noteText && !isStaticFallback
      ? noteText
          .split(/\n/)
          .map((line) => line.replace(/^\d+\.\s*/, "").trim())
          .filter(Boolean)
      : [];
  const requestedDate = fmtDateTime(order.currentRevision?.requestedAt);

  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-4 dark:border-orange-500/20 dark:bg-orange-500/10">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300">
          <AlertCircle className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Revision notes</p>
          {notes.length > 0 ? (
            <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
              {notes.map((note, idx) => (
                <li key={idx} className="leading-relaxed">
                  {note}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Please review the brand&apos;s feedback in the chat and make the
              requested changes.
            </p>
          )}
          {requestedDate ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Requested on {requestedDate}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BrandReviewCard({
  orderId,
  brand,
}: {
  orderId: string;
  brand: OrderBrandSnapshot;
}) {
  const reviewQuery = useGetOrderRatingReviewQuery(orderId, { retry: false });
  const existingReview = reviewQuery.data ?? null;
  const brandLabel = brandDisplayName(brand.brandName);

  return (
    <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-500">
          <Star className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">Brand&apos;s review</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Feedback from{" "}
            <span className="font-medium text-foreground">{brandLabel}</span>
          </p>
        </div>
      </div>

      {reviewQuery.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" aria-hidden />
          Loading...
        </div>
      ) : existingReview ? (
        <div className="space-y-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-7",
                  i < existingReview.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/20",
                )}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-emerald-600">
            {RATING_LABELS[existingReview.rating]}
          </p>
          {existingReview.review ? (
            <p className="text-sm text-muted-foreground">
              {existingReview.review}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/60 py-8 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-muted/50">
            <Star className="size-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">No review yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The brand hasn&apos;t left a review for this order.
          </p>
        </div>
      )}
    </div>
  );
}

function CancellationReasonCard({ order }: { order: OrderDetailsPublic }) {
  const cancelDate = fmtDateTime(
    order.cancelledAt ?? order.refundedAt ?? order.updatedAt,
  );
  const reason =
    order.cancellationReason ||
    "No specific reason was provided for this cancellation.";
  const cancelledByCreator = order.cancelledBy === "CREATOR";
  const cancelledBy = cancelledByCreator
    ? "You"
    : order.cancelledBy === "BRAND"
      ? "Brand"
      : "Admin";
  const sentence = cancelledByCreator
    ? "You rejected this order."
    : `The ${cancelledBy.toLowerCase()} cancelled this order.`;

  return (
    <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
          <XCircle className="size-5" />
        </div>
        <h3 className="text-lg font-bold text-foreground">
          Cancellation reason
        </h3>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">{sentence}</p>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-500/20 dark:bg-red-500/5">
        <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
          Reason provided by {cancelledBy}
        </p>
        <p className="text-sm italic leading-relaxed text-foreground/80">
          &ldquo;{reason}&rdquo;
        </p>
      </div>

      {cancelDate ? (
        <p className="mt-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
          Cancelled on {cancelDate}
        </p>
      ) : null}
    </div>
  );
}

function DisputeNoticeCard({ order }: { order: OrderDetailsPublic }) {
  const openedByCreator = order.dispute?.openedBy === "CREATOR";
  const reason = order.dispute?.reason;
  const openedAt = fmtDateTime(order.dispute?.openedAt);

  return (
    <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-foreground">
            Order under dispute
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {openedByCreator
              ? "You raised this dispute. Our support team is reviewing the case and will keep you updated in the chat."
              : "The brand raised this dispute. Our support team is reviewing the case — you can respond in the chat."}
          </p>
          {reason ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-background/60 p-3 dark:border-amber-500/20">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Reason
              </p>
              <p className="text-sm italic leading-relaxed text-foreground/80">
                &ldquo;{reason}&rdquo;
              </p>
            </div>
          ) : null}
          {openedAt ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Opened on {openedAt}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                   */
/* -------------------------------------------------------------------------- */

function CreatorOrderDetailsSkeleton() {
  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-4">
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main view                                                                  */
/* -------------------------------------------------------------------------- */

export function CreatorOrderDetailsView({
  orderId,
}: Readonly<CreatorOrderDetailsViewProps>) {
  const { data, isLoading, isError, error } =
    useGetCreatorOrderDetailsQuery(orderId);
  const { data: briefData } = useGetOrderBriefQuery(orderId);

  if (isLoading) {
    return <CreatorOrderDetailsSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="size-5" />
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground">
                Unable to load this order
              </h1>
              <p className="max-w-xl text-sm text-muted-foreground">
                {error?.message ||
                  "The order details request did not return usable data."}
              </p>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/creator/orders">
                  <ArrowLeft className="size-4" />
                  Back to orders
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { order, brand } = data;
  const brief = briefData?.brief ?? null;
  const briefId = order.briefId ?? brief?.id ?? null;
  const briefHref = `/creator/orders/${orderId}/brief`;

  const phase = resolvePhase(order);
  const isCancelled = phase === "cancelled";

  const showChat = ["awaiting_shipment", "in_progress", "revision", "delivered", "completed", "disputed"].includes(
    phase,
  );

  function renderPhaseContent() {
    switch (phase) {
      case "new_request":
        return null;
      case "awaiting_shipment":
        return null;
      case "in_progress":
        return (
          <CreatorContentUploadCard
            orderId={orderId}
            title="Deliver your content"
            description="Upload your video(s) here for the brand to review."
            canUpload
            emptyLabel="No content uploaded yet — add your files to get started."
            footer={
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due date</span>
                <DeliveryDeadlineDisplay
                  order={order}
                  dateClassName="text-sm font-semibold text-foreground"
                />
              </div>
            }
          />
        );
      case "revision":
        return (
          <CreatorContentUploadCard
            orderId={orderId}
            title="Upload revised content"
            description="Address the brand's notes and upload your revised version."
            canUpload
            withNote
            banner={<RevisionNotesBanner order={order} />}
            footer={
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Due date</span>
                <DeliveryDeadlineDisplay
                  order={order}
                  dateClassName="text-sm font-semibold text-foreground"
                />
              </div>
            }
          />
        );
      case "delivered":
        return (
          <CreatorContentUploadCard
            orderId={orderId}
            title="Delivered content"
            description="Your submitted content is with the brand for review."
            emptyLabel="No delivery files found."
            footer={
              <div className="flex items-center gap-2.5">
                <Clock className="size-4 shrink-0 text-amber-500" />
                <p className="text-sm text-muted-foreground">
                  Waiting for the brand to review. You&apos;ll be paid once your
                  content is approved.
                </p>
              </div>
            }
          />
        );
      case "completed":
        return (
          <>
            <CreatorContentUploadCard
              orderId={orderId}
              title="Delivered content"
              description="The final content approved for this order."
              emptyLabel="No delivery files found."
              footer={
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">
                    Approved by the brand
                    {order.acceptedAt
                      ? ` on ${fmtDateTime(order.acceptedAt)}`
                      : ""}
                    .
                  </p>
                </div>
              }
            />
            <BrandReviewCard orderId={orderId} brand={brand} />
          </>
        );
      case "cancelled":
        return <CancellationReasonCard order={order} />;
      case "disputed":
        return <DisputeNoticeCard order={order} />;
      default:
        return null;
    }
  }

  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 flex flex-col gap-5">
      <CreatorOrderHeader
        order={order}
        brand={brand}
        showMessageBrand={showChat}
      />

      <CreatorOrderProgressStepper order={order} />

      <DisputeResolvedBanner dispute={order.dispute} />

      {phase !== "new_request" ? (
        <CreatorStatusBanner order={order} brand={brand} phase={phase} />
      ) : null}

      {phase === "new_request" && brief ? (
        <BriefSummaryCard
          order={order}
          brief={brief}
          briefId={briefId}
          briefHref={briefHref}
          actions={<BriefDecisionActions orderId={orderId} />}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        <div className="flex flex-col gap-5 lg:col-span-8">
          {phase === "awaiting_shipment" ? (
            <>
              <ShippingDetailsCard order={order} />
              {brief ? (
                <BriefSummaryCard
                  order={order}
                  brief={brief}
                  briefId={briefId}
                  briefHref={briefHref}
                />
              ) : null}
              <CreatorOrderSummaryCard
                order={order}
                brand={brand}
                orderId={orderId}
                cancelled={isCancelled}
              />
            </>
          ) : phase === "in_progress" ||
            phase === "revision" ||
            phase === "delivered" ||
            phase === "completed" ? (
            <>
              {renderPhaseContent()}
              {brief ? (
                <BriefSummaryCard
                  order={order}
                  brief={brief}
                  briefId={briefId}
                  briefHref={briefHref}
                />
              ) : null}
              <CreatorOrderSummaryCard
                order={order}
                brand={brand}
                orderId={orderId}
                cancelled={isCancelled}
              />
            </>
          ) : (
            <>
              {phase !== "new_request" && brief ? (
                <BriefSummaryCard
                  order={order}
                  brief={brief}
                  briefId={briefId}
                  briefHref={briefHref}
                />
              ) : null}
              <CreatorOrderSummaryCard
                order={order}
                brand={brand}
                orderId={orderId}
                cancelled={isCancelled}
              />
              {renderPhaseContent()}
            </>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          {showChat ? (
            <div className="hidden lg:block">
              <OrderChatWidget orderId={orderId} role="creator" brand={brand} />
            </div>
          ) : null}
          <CreatorOrderActivityTimeline order={order} />
        </aside>
      </div>
    </div>
  );
}
