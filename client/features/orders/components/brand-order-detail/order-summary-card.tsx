"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Clock3,
  Package,
  PlusCircle,
  ShieldCheck,
  TicketPercent,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ReasonPromptDialog } from "../reason-prompt-dialog";
import { useCancelOrderMutation } from "../../hooks/use-cancel-order-mutation";
import { getDeliveryTimeline } from "../../lib/delivery-timeline";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "../../api/types";

interface OrderSummaryCardProps {
  order: OrderDetailsPublic;
  creator: OrderCreatorSnapshot;
}

const CANCELLABLE_STATUSES = new Set([
  "BRIEF_SUBMISSION_PENDING",
  "BRIEF_SUBMITTED",
]);

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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

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
              : "Order deadline"}
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
            ? `${order.deliveryDaysSnapshot}-day delivery window once the creator has the product.`
            : isOverdue
              ? "The delivery window and grace period have both ended."
              : isGrace
                ? remainingLabel
                  ? `${remainingLabel} in the grace period.`
                  : "The promised deadline has passed. Grace is now active."
                : remainingLabel
                  ? `${remainingLabel} for the creator to deliver.`
                  : "Promised delivery date for this order."}
        </p>
      </div>
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function OrderSummaryCard({
  order,
  creator,
}: Readonly<OrderSummaryCardProps>) {
  const packageAmount = Number.parseFloat(order.priceAmountSnapshot) || 0;
  const addOnsTotal = Number.parseFloat(order.addOnsTotalSnapshot ?? "0") || 0;
  const couponDiscount = (order.coupon?.discountAmountPaise ?? 0) / 100;
  const extraRevisionsAmount = (order.extraRevisionsPaidPaise ?? 0) / 100;
  const extraUsageRightsAmount = (order.extraUsageRightsPaidPaise ?? 0) / 100;
  const couponGrossAmount = (order.coupon?.grossAmountPaise ?? 0) / 100;
  const checkoutGrossAmount =
    couponGrossAmount > 0 ? couponGrossAmount : packageAmount + addOnsTotal;
  const checkoutPaidAmount = order.expectedAmountPaise / 100;
  const totalAmount =
    checkoutPaidAmount + extraRevisionsAmount + extraUsageRightsAmount;
  const creatorLabel = creator.displayName || "Creator";
  const creatorLanguages = creator.languages?.filter(Boolean) ?? [];
  const couponCode = order.coupon?.code?.trim() ?? "";
  const couponTitle =
    couponDiscount > 0
      ? couponCode
        ? `Coupon (${couponCode})`
        : "Coupon"
      : "First order free";
  const couponSubtitle =
    couponDiscount > 0
      ? order.coupon?.name || "Discount applied at checkout"
      : "Promo discount applied";
  const canCancelOrder = CANCELLABLE_STATUSES.has(order.status);
  const showDeadline =
    Boolean(order.briefAcceptedAt) ||
    BRIEF_ACCEPTED_OR_LATER.has(order.status);
  const hasAddOns = order.addOnsSnapshot.length > 0;
  const firstOrderFreeDiscount =
    order.isFreeOrder && checkoutGrossAmount > 0 ? checkoutGrossAmount : 0;

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isAddOnsExpanded, setIsAddOnsExpanded] = useState(false);
  const cancelOrderMutation = useCancelOrderMutation({
    onSuccess: () => setIsCancelOpen(false),
  });

  return (
    <div className="rounded-3xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground">
              Order Summary
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A complete view of your order pricing, discounts, and payments.
            </p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3 shadow-sm md:min-w-55 dark:border-rose-500/20 dark:bg-rose-500/10">
            <p className="text-xs font-medium text-muted-foreground">
              Total paid so far
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              {formatMoney(totalAmount, order.currency)}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="mb-3 rounded-2xl border border-border/70 bg-muted/18 p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="size-12 shrink-0 border border-primary/10">
                <AvatarImage
                  src={creator.profileImageUrl || undefined}
                  alt={creatorLabel}
                />
                <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                  {getInitials(creatorLabel)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Creator
                </p>
                {creator.city ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {creator.city}
                  </p>
                ) : null}
                {creatorLanguages.length > 0 ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {creatorLanguages.join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {creator.primaryNiche ? (
                <span className="inline-flex items-center rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-foreground">
                  Primary niche: {creator.primaryNiche}
                </span>
              ) : null}
              <Button
                variant="outline"
                className="h-9 rounded-xl px-4 text-sm font-semibold"
                asChild
              >
                <Link href={`/brand/creators?creatorId=${creator.id}`}>
                  View Profile
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
                    Base package
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {formatMoney(packageAmount, order.currency)}
                </span>
              </div>

              <div className="rounded-2xl">
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-2xl px-2 py-2 text-left transition-colors",
                    hasAddOns && "hover:bg-muted/30",
                  )}
                  onClick={() => {
                    if (!hasAddOns) return;
                    setIsAddOnsExpanded((prev) => !prev);
                  }}
                  disabled={!hasAddOns}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                      <PlusCircle className="size-4" />
                    </div>
                    <span className="truncate text-sm font-medium text-foreground">
                      Add-ons ({order.addOnsSnapshot.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {formatMoney(addOnsTotal, order.currency)}
                    </span>
                    {hasAddOns ? (
                      <ChevronDown
                        className={cn(
                          "size-4 text-muted-foreground transition-transform",
                          isAddOnsExpanded && "rotate-180",
                        )}
                      />
                    ) : null}
                  </div>
                </button>

                {hasAddOns && isAddOnsExpanded ? (
                  <div className="ml-12 mt-1 space-y-2 rounded-2xl border border-border/60 bg-muted/22 p-3">
                    {order.addOnsSnapshot.map((addOn) => (
                      <div
                        key={addOn.id}
                        className="flex items-start justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {addOn.name}
                          </p>
                          {addOn.description ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {addOn.description}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-sm font-medium text-foreground tabular-nums whitespace-nowrap">
                          {formatMoney(
                            Number.parseFloat(addOn.priceAmount) || 0,
                            order.currency,
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {couponDiscount > 0 || firstOrderFreeDiscount > 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <TicketPercent className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {couponTitle}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-300">
                        {couponSubtitle}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600 tabular-nums dark:text-emerald-300">
                    -{formatMoney(couponDiscount || firstOrderFreeDiscount, order.currency)}
                  </span>
                </div>
              ) : null}

              {extraRevisionsAmount > 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Extra revisions ({order.extraRevisionsAdded})
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Purchased during the order
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMoney(extraRevisionsAmount, order.currency)}
                  </span>
                </div>
              ) : null}

              {extraUsageRightsAmount > 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl px-2 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      Usage rights extension ({order.usageRightsExtraDays} days)
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Purchased after order completion
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMoney(extraUsageRightsAmount, order.currency)}
                  </span>
                </div>
              ) : null}

              <div className="rounded-2xl bg-rose-50 px-4 py-3 dark:bg-rose-500/10">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                    Amount charged at checkout
                  </span>
                  <span className="text-lg font-extrabold text-rose-600 tabular-nums dark:text-rose-300">
                    {formatMoney(checkoutPaidAmount, order.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-100/70 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                <ShieldCheck className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Payment is held securely
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Your payment stays protected while the order is in progress and
                  remains secure throughout the review process.
                </p>
              </div>
            </div>

            {canCancelOrder ? (
              <div className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                <p className="text-sm font-semibold text-foreground">
                  Need to cancel this order?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  You can cancel before the creator accepts. Any amount
                  paid will be refunded.
                </p>

                <Button
                  variant="outline"
                  className="mt-4 h-11 w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={cancelOrderMutation.isPending}
                  onClick={() => setIsCancelOpen(true)}
                >
                  <XCircle className="size-4" />
                  Cancel Order
                </Button>
              </div>
            ) : showDeadline ? (
              <OrderDeadlinePanel order={order} />
            ) : null}
          </div>
        </div>
      </div>

      <ReasonPromptDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Cancel this order?"
        description={`The creator will be notified that you’ve cancelled this order, along with your reason. Any amount paid will be refunded. This can’t be undone.`}
        label="Reason for cancelling"
        placeholder="Let the creator know why you’re cancelling…"
        confirmLabel="Cancel Order"
        pendingLabel="Cancelling..."
        isPending={cancelOrderMutation.isPending}
        onConfirm={(note) =>
          cancelOrderMutation.mutate({ orderId: order.id, note })
        }
      />
    </div>
  );
}
