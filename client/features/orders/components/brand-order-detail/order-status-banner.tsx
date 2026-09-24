"use client";

import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useResumeOrderCheckout } from "@/features/payments/hooks/use-resume-order-checkout";
import { useWithdrawBrandDisputeMutation } from "../../hooks/use-withdraw-brand-dispute-mutation";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";

interface OrderStatusBannerProps {
  order: OrderDetailsPublic;
  creator?: OrderCreatorSnapshot;
  isOrderCompleted?: boolean;
}

interface StatusConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  showTimer: boolean;
  variant: "info" | "warning" | "success" | "neutral";
}

function getStatusConfig(
  status: string,
  creatorName: string,
  requiresPhysicalProductShipment?: boolean,
): StatusConfig {
  switch (status) {
    case "BRIEF_ACCEPTED":
      if (requiresPhysicalProductShipment) {
        return {
          icon: Info,
          title: "Brief accepted — awaiting shipment",
          description: `${creatorName} has accepted your brief. Ship your product to begin the production process.`,
          showTimer: false,
          variant: "info",
        };
      }
      return {
        icon: Info,
        title: "Brief accepted — In progress",
        description: `${creatorName} has accepted your brief and is working on your content.`,
        showTimer: false,
        variant: "info",
      };
    case "PRODUCT_SHIPPED":
      return {
        icon: Info,
        title: "Product shipped",
        description: `Your product is on its way to ${creatorName}. Production will begin once it arrives.`,
        showTimer: false,
        variant: "info",
      };
    case "PRODUCT_RECEIVED":
      return {
        icon: Info,
        title: "Product received — In progress",
        description: `${creatorName} has received the product and is working on your content.`,
        showTimer: false,
        variant: "info",
      };
    case "DELIVERED":
    case "REVISION_SUBMITTED":
      return {
        icon: Info,
        title: "Content delivered",
        description: `${creatorName} has submitted the content for your review. Approve or request a revision.`,
        showTimer: false,
        variant: "success",
      };
    case "REVISION_REQUESTED":
      return {
        icon: AlertCircle,
        title: "Revision requested",
        description: `You've requested a revision. ${creatorName} will submit updated content soon.`,
        showTimer: false,
        variant: "warning",
      };
    case "ACCEPTED":
    case "CREATOR_PAYMENT_DONE":
      return {
        icon: Info,
        title: "Order completed",
        description:
          "This order has been completed successfully. Thank you for using GoCollab!",
        showTimer: false,
        variant: "success",
      };
    case "DISPUTED":
      return {
        icon: AlertCircle,
        title: "Order disputed",
        description:
          "This order is currently under dispute. Our team is reviewing the case.",
        showTimer: false,
        variant: "warning",
      };
    case "REJECTED":
      return {
        icon: AlertCircle,
        title: "Order cancelled",
        description:
          "This order has been cancelled. Any amount paid will be refunded to your original payment method.",
        showTimer: false,
        variant: "warning",
      };
    case "REFUNDED":
      return {
        icon: Info,
        title: "Order refunded",
        description:
          "This order has been refunded. The amount will be credited to your account.",
        showTimer: false,
        variant: "neutral",
      };
    case "CANCELLED_CREDITED":
      return {
        icon: Info,
        title: "Order cancelled — credited",
        description:
          "This order was cancelled and its amount was added to your Credits. Use it at checkout, or request a refund from the Credits page.",
        showTimer: false,
        variant: "neutral",
      };
    case "PENDING_PAYMENT":
      return {
        icon: AlertCircle,
        title: "Awaiting payment",
        description:
          "Complete payment to confirm this order and continue to brief submission.",
        showTimer: false,
        variant: "warning",
      };
    default:
      return {
        icon: Info,
        title: "Processing",
        description: "Your order is being processed.",
        showTimer: false,
        variant: "neutral",
      };
  }
}

const VARIANT_STYLES = {
  info: "bg-background border-border shadow-sm",
  warning:
    "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20",
  success:
    "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  neutral: "bg-muted/50 border-border",
};

const ICON_STYLES = {
  info: "bg-primary/10 text-primary dark:bg-primary/20",
  warning: "bg-background/80 text-amber-600 dark:text-amber-400",
  success: "bg-background/80 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-background/80 text-muted-foreground",
};

export function OrderStatusBanner({ order, creator, isOrderCompleted = false }: OrderStatusBannerProps) {
  const creatorName = creator?.displayName ?? "Creator";
  const isAwaitingAcceptance =
    order.status === "BRIEF_SUBMITTED" ||
    (!!order.briefSubmittedAt && !order.briefAcceptedAt);
  const { isGatewayReady, isProcessing, resumePayment } = useResumeOrderCheckout(
    order.id,
    order.packageNameSnapshot,
  );

  const withdrawDisputeMutation = useWithdrawBrandDisputeMutation();
  const canWithdrawDispute =
    !isOrderCompleted &&
    order.status === "DISPUTED" &&
    order.dispute?.openedBy === "BRAND";

  if (!isOrderCompleted && order.status === "BRIEF_SUBMISSION_PENDING") {
    return null;
  }

  if (!isOrderCompleted && isAwaitingAcceptance) {
    return null;
  }

  const config = isOrderCompleted
    ? getStatusConfig("ACCEPTED", creatorName, order.requiresPhysicalProductShipment)
    : getStatusConfig(
        order.status,
        creatorName,
        order.requiresPhysicalProductShipment,
      );
  const Icon = config.icon;

  let displayTitle = config.title;
  let displayDescription = config.description;
  const displayVariant = config.variant;

  if (order.status === "DISPUTED" && order.dispute) {
    displayDescription =
      order.dispute.openedBy === "BRAND"
        ? `You raised this dispute: “${order.dispute.reason}”. Our team is reviewing the case.`
        : `${creatorName} raised this dispute: “${order.dispute.reason}”. Our team is reviewing the case.`;
  }

  if (!isOrderCompleted && order.status === "REJECTED" && order.cancellationReason) {
    const lead =
      order.cancelledBy === "CREATOR"
        ? `${creatorName} rejected this order`
        : order.cancelledBy === "BRAND"
          ? "You cancelled this order"
          : "This order was cancelled";
    displayTitle =
      order.cancelledBy === "CREATOR" ? "Order rejected" : "Order cancelled";
    displayDescription = `${lead}. Reason: “${order.cancellationReason}”. Any amount paid will be refunded.`;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border px-6 py-5 sm:flex-row sm:items-center sm:justify-between",
        VARIANT_STYLES[displayVariant],
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            ICON_STYLES[displayVariant],
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="mt-0.5">
          <p className="text-[15px] font-bold text-foreground">
            {displayTitle}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {displayDescription}
          </p>
        </div>
      </div>

      {!isOrderCompleted && order.status === "PENDING_PAYMENT" && (
        <Button
          className="shrink-0 sm:self-center mt-2 sm:mt-0 bg-[#6E42FF] hover:bg-[#5b33d6] text-white"
          disabled={!isGatewayReady || isProcessing}
          onClick={() => {
            void resumePayment();
          }}
        >
          {isProcessing ? (
            <>
              <Spinner className="size-4" aria-hidden />
              Opening payment...
            </>
          ) : (
            "Complete payment"
          )}
        </Button>
      )}

      {canWithdrawDispute && (
        <Button
          variant="outline"
          className="shrink-0 sm:self-center mt-2 sm:mt-0"
          disabled={withdrawDisputeMutation.isPending}
          onClick={() => withdrawDisputeMutation.mutate({ orderId: order.id })}
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
      )}
    </div>
  );
}
