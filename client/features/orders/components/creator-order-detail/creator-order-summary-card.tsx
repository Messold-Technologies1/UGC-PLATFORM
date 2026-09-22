"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, MessageSquare, ShieldCheck } from "lucide-react";
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
  "DISPUTED",
]);

function formatDeadlineDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DeadlineNote({ order }: Readonly<{ order: OrderDetailsPublic }>) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
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
    remaining == null ? null : `${remaining} day${remaining === 1 ? "" : "s"} left`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3",
        isOverdue
          ? "border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/10"
          : isGrace
            ? "border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10"
            : "border-border/70 bg-muted/20",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          isOverdue
            ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300"
            : isGrace
              ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
              : "bg-background text-muted-foreground",
        )}
      >
        <Clock3 className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {isOverdue ? "Past grace period" : isGrace ? "Grace period ends" : "Delivery deadline"}
        </p>
        <p className="text-sm font-bold text-foreground">
          {waitingToStart
            ? "Starts after product receipt"
            : isOverdue
              ? "Overdue"
              : `${formatDeadlineDate(timeline.displayDate)}${
                  remainingLabel ? ` · ${remainingLabel}` : ""
                }`}
        </p>
      </div>
    </div>
  );
}

function PayoutRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
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
  const packageName = order.packageNameSnapshot || "UGC Video";

  const showDeadline =
    !cancelled &&
    (Boolean(order.briefAcceptedAt) ||
      BRIEF_ACCEPTED_OR_LATER.has(order.status));

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      {/* Brand identity — name + logo only */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-12 shrink-0 rounded-2xl border border-border/50">
            <AvatarImage
              src={brand.logoUrl || undefined}
              alt={brandLabel}
              className="rounded-2xl object-cover"
            />
            <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-bold text-primary">
              {brandInitials(brand.brandName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Order from
            </p>
            <p className="truncate text-base font-bold text-foreground">
              {brandLabel}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {packageName}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 rounded-xl px-3 text-sm font-semibold"
          asChild
        >
          <Link
            href={`/creator/messages?orderId=${orderId}`}
            className="flex items-center gap-1.5"
          >
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Contact Brand</span>
          </Link>
        </Button>
      </div>

      {/* Payout */}
      <div className="px-5 py-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {cancelled
                ? "This order was cancelled."
                : "Here's what you'll earn from this order."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {cancelled ? "Payout" : "Your payout"}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-300">
              {formatCreatorPayoutInr(netPayout)}
            </p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/70 bg-background">
          <PayoutRow
            label="Base payout"
            value={formatCreatorPayoutInr(basePayout)}
          />
          <PayoutRow
            label={`Add-ons (${addOnsCount})`}
            value={formatCreatorPayoutInr(safeAddOns)}
          />
          <PayoutRow
            label={`Platform fee (${platformFeePercent}%)`}
            value={`−${formatCreatorPayoutInr(platformFee)}`}
            muted
          />
          <div className="flex items-center justify-between gap-4 rounded-b-2xl bg-emerald-50/70 px-4 py-3 dark:bg-emerald-500/10">
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
              {cancelled ? "Payout" : "You receive"}
            </span>
            <span className="text-lg font-extrabold text-emerald-700 tabular-nums dark:text-emerald-300">
              {formatCreatorPayoutInr(netPayout)}
            </span>
          </div>
        </div>

        <div className="mt-3">
          {cancelled ? (
            <p className="rounded-2xl border border-border/70 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
              This order was cancelled, so no payout will be processed.
            </p>
          ) : showDeadline ? (
            <DeadlineNote order={order} />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100/70 bg-emerald-50/60 px-4 py-3 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                <ShieldCheck className="size-4" />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your payout is held securely and released once your delivered
                content is approved.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
