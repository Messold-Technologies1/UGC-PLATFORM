"use client";

import Link from "next/link";
import { AlertCircle, Clock, Info, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { OrderDetailsPublic } from "../../api/types";
import type { OrderCreatorSnapshot } from "../../api/types";

interface OrderStatusBannerProps {
  order: OrderDetailsPublic;
  creator?: OrderCreatorSnapshot;
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
    case "BRIEF_SUBMISSION_PENDING":
      return {
        icon: Info,
        title: "Brief submission pending",
        description: `Submit your brief so ${creatorName} can review and start working on your project.`,
        showTimer: false,
        variant: "warning",
      };
    case "BRIEF_SUBMITTED":
      return {
        icon: Hourglass,
        title: "Awaiting creator acceptance",
        description: `${creatorName} has 48 hours to accept your project. You'll be notified once she accepts.`,
        showTimer: true,
        variant: "info",
      };
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
        description: "This order has been completed successfully. Thank you for using GoCollab!",
        showTimer: false,
        variant: "success",
      };
    case "DISPUTED":
      return {
        icon: AlertCircle,
        title: "Order disputed",
        description: "This order is currently under dispute. Our team is reviewing the case.",
        showTimer: false,
        variant: "warning",
      };
    case "REFUNDED":
      return {
        icon: Info,
        title: "Order refunded",
        description: "This order has been refunded. The amount will be credited to your account.",
        showTimer: false,
        variant: "neutral",
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
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20",
  success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  neutral: "bg-muted/50 border-border",
};

const ICON_STYLES = {
  info: "bg-primary/10 text-primary dark:bg-primary/20",
  warning: "bg-background/80 text-amber-600 dark:text-amber-400",
  success: "bg-background/80 text-emerald-600 dark:text-emerald-400",
  neutral: "bg-background/80 text-muted-foreground",
};

import { useAcceptanceCountdown } from "../../hooks/use-acceptance-countdown";

export function OrderStatusBanner({ order, creator }: OrderStatusBannerProps) {
  const creatorName = creator?.displayName ?? "Creator";
  const config = getStatusConfig(
    order.status,
    creatorName,
    order.requiresPhysicalProductShipment,
  );
  const Icon = config.icon;
  const { hours, minutes, seconds } = useAcceptanceCountdown(
    order.briefSubmittedAt,
    order.status
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border px-6 py-5 sm:flex-row sm:items-center sm:justify-between",
        VARIANT_STYLES[config.variant],
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            ICON_STYLES[config.variant],
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="mt-0.5">
          <p className="text-[15px] font-bold text-foreground">
            {config.title}
          </p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {config.description}
          </p>
        </div>
      </div>

      {config.showTimer && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/5 dark:bg-primary/10 px-4 py-3 text-sm font-medium text-foreground shrink-0 sm:self-center">
          <span className="text-muted-foreground text-[13px]">Auto-cancel in</span>
          <span className="font-bold text-primary tracking-wide tabular-nums">
            {hours}h : {minutes}m : {seconds}s
          </span>
        </div>
      )}

      {order.status === "BRIEF_ACCEPTED" && order.requiresPhysicalProductShipment && (
        <Button asChild className="shrink-0 sm:self-center mt-2 sm:mt-0">
          <Link href={`/brand/orders/${order.id}/shipping`}>
            Add Shipping Details
          </Link>
        </Button>
      )}
    </div>
  );
}

