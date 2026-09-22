"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Clock3,
  Mail,
  MessageSquare,
  Package,
  PlusCircle,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brandDisplayName, brandInitials } from "@/features/brands/lib/brand-display";
import { getDeliveryTimeline } from "../../lib/delivery-timeline";
import {
  formatCreatorPayoutInr,
  getCreatorPayoutFromOrderTotal,
  resolveOrderTotalInr,
} from "../../lib/creator-payout";
import { PLATFORM_FEE_RATE } from "@/features/creators/hooks/creator-profile-form-utils";
import type { OrderBrandSnapshot, OrderDetailsPublic } from "../../api/types";

interface CreatorOrderSummaryCardProps {
  order: OrderDetailsPublic;
  brand: OrderBrandSnapshot;
  orderId: string;
  /** Cancelled/refunded orders earn no payout — show ₹0 and a note instead. */
  cancelled?: boolean;
}

const BRIEF_ACCEPTED_OR_LATER = new Set([
  "BRIEF_ACCEPTED",
  "PRODUCT_SHIPPED",
  "PRODUCT_RECEIVED",
  "DELIVERED",
  "REVISION_REQUESTED",
  "REVISION_SUBMITTED",
  "DISPUTED",
  "ACCEPTED",
  "CREATOR_PAYMENT_DONE",
]);

function formatDeadlineDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderDeadlinePanel({ order }: Readonly<{ order: OrderDetailsPublic }>) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const timeline = useMemo(
    () => getDeliveryTimeline({ ...order, deliveredAt: null }, now),
    [order, now],
  );

  const isGrace = timeline.phase === "grace";
  const isOverdue = timeline.phase === "overdue";
  const waitingToStart = timeline.phase === "not_started";
  const remaining = timeline.daysRemaining;
  const remainingLabel =
    remaining == null
      ? null
      : `${remaining} day${remaining === 1 ? "" : "s"} left`;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        isOverdue
          ? "border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10"
          : isGrace
            ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10"
            : "border-violet-200 bg-violet-50/70 dark:border-violet-500/20 dark:bg-violet-500/10",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isOverdue
            ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
            : isGrace
              ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
              : "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300",
        )}
      >
        <Clock3 className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {isOverdue
            ? "Past grace period"
            : isGrace
              ? "Grace period ends"
              : "Delivery deadline"}
        </p>
        <p className="mt-1 text-sm font-bold text-foreground">
          {waitingToStart
            ? "Starts after product receipt"
            : isOverdue
              ? "Overdue"
              : formatDeadlineDate(timeline.displayDate)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {waitingToStart
            ? `${order.deliveryDaysSnapshot}-day delivery window once you receive the product.`
            : isOverdue
              ? "The delivery window and grace period have both ended."
              : isGrace
                ? remainingLabel
                  ? `${remainingLabel} in the grace period.`
                  : "The promised deadline has passed. Grace is now active."
                : remainingLabel
                  ? `${remainingLabel} to deliver your content.`
                  : "Your promised delivery date for this order."}
        </p>
      </div>
    </div>
  );
}

export function CreatorOrderSummaryCard({
  order,
  brand,
  orderId,
  cancelled = false,
}: Readonly<CreatorOrderSummaryCardProps>) {
  const orderTotal = resolveOrderTotalInr({
    expectedAmountPaise: order.expectedAmountPaise,
    priceAmountSnapshot: order.priceAmountSnapshot,
  });
  const { platformFee, creatorEarnings } =
    getCreatorPayoutFromOrderTotal(orderTotal);

  const addOnsRaw = order.addOnsTotalSnapshot;
  const parsedAddOns = addOnsRaw ? Number.parseFloat(String(addOnsRaw)) : 0;
  const safeAddOns = Number.isFinite(parsedAddOns) ? parsedAddOns : 0;
  const basePayout = Math.max(0, orderTotal - safeAddOns);
  const addOnsCount = order.addOnsSnapshot?.length ?? 0;
  const platformFeePercent = Math.round(PLATFORM_FEE_RATE * 100);

  const netPayout = cancelled ? 0 : creatorEarnings;

  const brandLabel = brandDisplayName(brand.brandName);
  const contactName = brand.contactFullName?.trim();
  const contactEmail = brand.contactEmail?.trim();

  const showDeadline =
    !cancelled &&
    (Boolean(order.briefAcceptedAt) ||
      BRIEF_ACCEPTED_OR_LATER.has(order.status)) &&
    !["DELIVERED", "REVISION_SUBMITTED", "ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(
      order.status,
    );

  return (
    <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The brand behind this order and the payout you&apos;ll receive.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 shadow-sm md:min-w-55 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-xs font-medium text-muted-foreground">
              {cancelled ? "Payout" : "Your payout"}
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-300">
              {formatCreatorPayoutInr(netPayout)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="mb-3 rounded-2xl border border-border/70 bg-muted/18 p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="size-12 shrink-0 border border-primary/10">
                <AvatarImage src={brand.logoUrl || undefined} alt={brandLabel} />
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {brandInitials(brand.brandName)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Brand
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-foreground">
                  {brandLabel}
                </p>
                {contactName ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="size-3.5 shrink-0" />
                    <span className="truncate">{contactName}</span>
                  </p>
                ) : null}
                {contactEmail ? (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="size-3.5 shrink-0" />
                    <span className="truncate">{contactEmail}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                variant="outline"
                className="h-9 rounded-xl px-4 text-sm font-semibold"
                asChild
              >
                <Link
                  href={`/creator/messages?orderId=${orderId}`}
                  className="flex items-center gap-1.5"
                >
                  <MessageSquare className="size-4" />
                  Contact Brand
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                    <Package className="size-4" />
                  </div>
                  <span className="truncate text-sm font-medium text-foreground">
                    Base payout
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCreatorPayoutInr(basePayout)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                    <PlusCircle className="size-4" />
                  </div>
                  <span className="truncate text-sm font-medium text-foreground">
                    Add-ons ({addOnsCount})
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatCreatorPayoutInr(safeAddOns)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                    <Wallet className="size-4" />
                  </div>
                  <span className="truncate text-sm font-medium text-foreground">
                    Platform fee ({platformFeePercent}%)
                  </span>
                </div>
                <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                  −{formatCreatorPayoutInr(platformFee)}
                </span>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-300">
                    {cancelled ? "Payout" : "Your payout"}
                  </span>
                  <span className="text-lg font-extrabold text-emerald-600 tabular-nums dark:text-emerald-300">
                    {formatCreatorPayoutInr(netPayout)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {cancelled ? (
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Wallet className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    No payout for this order
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    This order was cancelled, so no payout will be processed.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-100/70 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    Your payout is protected
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The brand&apos;s payment is held securely and released to you
                    once your delivered content is approved.
                  </p>
                </div>
              </div>
            )}

            {showDeadline ? <OrderDeadlinePanel order={order} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
