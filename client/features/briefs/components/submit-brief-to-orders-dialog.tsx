"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, MapPin, Package, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { useGetBrandOrdersQuery } from "@/features/orders/hooks/use-get-brand-orders-query";
import type { OrderListSummary } from "@/features/orders/api/types";
import { useAttachBriefToOrdersMutation } from "@/features/briefs/hooks/use-attach-brief-to-orders-mutation";
import { useGetBriefQuery } from "@/features/briefs/hooks/use-get-brief-query";
import type { AttachBriefToOrdersResponse } from "@/features/briefs/api/attach-brief-to-orders";
import { useBuyTravelAddOn } from "@/features/payments/hooks/use-buy-travel-add-on";

const PENDING_STATUS = "BRIEF_SUBMISSION_PENDING";

/**
 * Shoot locations that put the creator on the road, so the order has to carry
 * the creator's travel add-on. Mirrors TRAVEL_REQUIRING_SHOOT_LOCATIONS on the
 * server, which is what rejects the submit.
 */
const TRAVEL_REQUIRING_SHOOT_LOCATIONS = [
  "OUTDOOR_PUBLIC_LOCATION",
  "BRAND_SELECTED_LOCATION",
];

function formatPaise(paise: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

/**
 * The per-order travel row inside an order card. Its own component because the
 * buy hook is per order — one order's payment must not spin every other row.
 */
function TravelAddOnRow({
  order,
  disabled,
}: {
  order: OrderListSummary;
  disabled: boolean;
}) {
  const { isProcessing, buyTravelAddOn } = useBuyTravelAddOn(order.id);
  const unitPaise = order.travelAddOnUnitPaise ?? null;

  if (order.travelAddOnPurchased) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
        <MapPin className="size-3 shrink-0" aria-hidden />
        On-location shoot covered — travel is on this order
      </p>
    );
  }

  // Nothing to sell: this creator doesn't travel, so the brief goes through and
  // the creator may reject it. Say so rather than offering a button.
  if (unitPaise == null) {
    return (
      <p className="mt-2 text-[11px] text-amber-700">
        This brief needs an on-location shoot, but this creator doesn&apos;t
        offer travel — they may reject it.
      </p>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2">
      <p className="min-w-0 text-[11px] text-amber-900">
        This brief needs an on-location shoot. Add travel to submit it.
      </p>
      <Button
        type="button"
        size="sm"
        onClick={(event) => {
          // The card is a <label>: without this the click toggles selection.
          event.preventDefault();
          event.stopPropagation();
          void buyTravelAddOn();
        }}
        disabled={disabled || isProcessing || !order.travelAddOnAvailable}
        className="h-7 shrink-0 rounded-lg px-3 text-[11px] font-bold"
      >
        {isProcessing ? (
          <>
            <Spinner className="mr-1.5 size-3" aria-hidden />
            Processing…
          </>
        ) : (
          <>Add travel — {formatPaise(unitPaise, order.currency)}</>
        )}
      </Button>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatAmount(amount: string | null | undefined, currency: string) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortId(id: string) {
  return id.substring(0, 8).toUpperCase();
}

export interface SubmitBriefToOrdersDialogProps {
  briefId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Order to pre-select when the dialog opens (e.g. the order the brief was opened from). */
  preselectOrderId?: string | null;
  /** Called after at least one order was successfully submitted. */
  onSubmitted?: (result: AttachBriefToOrdersResponse) => void;
}

export function SubmitBriefToOrdersDialog({
  briefId,
  open,
  onOpenChange,
  preselectOrderId,
  onSubmitted,
}: SubmitBriefToOrdersDialogProps) {
  const {
    data,
    isLoading,
    isError,
  } = useGetBrandOrdersQuery(
    { status: PENDING_STATUS, limit: 50 },
    { enabled: open },
  );

  const pendingOrders: OrderListSummary[] = useMemo(
    () => (data?.items ?? []).map((item) => item.order),
    [data],
  );

  // An on-location brief can only go to an order that carries the creator's
  // travel add-on — the server rejects the rest, which used to surface as a
  // bare "FAILED" row. Resolve it here so each card can say so, and sell the
  // add-on where there is one to sell.
  const { data: brief } = useGetBriefQuery(briefId ?? "", {
    enabled: open && Boolean(briefId),
  });
  const briefNeedsTravel = TRAVEL_REQUIRING_SHOOT_LOCATIONS.includes(
    String(brief?.shootLocationKind ?? ""),
  );
  const blockedOrderIds = useMemo(() => {
    if (!briefNeedsTravel) return new Set<string>();
    return new Set(
      pendingOrders
        // No travel on offer means nothing to buy: the brief is submittable and
        // the creator decides, so those orders are not blocked.
        .filter(
          (order) =>
            !order.travelAddOnPurchased && order.travelAddOnUnitPaise != null,
        )
        .map((order) => order.id),
    );
  }, [briefNeedsTravel, pendingOrders]);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Seed the selection with the preselected order whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setSelected(
      preselectOrderId ? new Set([preselectOrderId]) : new Set<string>(),
    );
  }, [open, preselectOrderId]);

  const mutation = useAttachBriefToOrdersMutation({
    onSuccess: (result) => {
      if (result.submittedCount > 0) {
        onSubmitted?.(result);
        onOpenChange(false);
      }
    },
  });

  const isSubmitting = mutation.isPending;

  const toggle = (orderId: string) => {
    if (blockedOrderIds.has(orderId)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const effectiveSelected = useMemo(
    () =>
      new Set([...selected].filter((orderId) => !blockedOrderIds.has(orderId))),
    [selected, blockedOrderIds],
  );

  const selectableOrders = useMemo(
    () => pendingOrders.filter((order) => !blockedOrderIds.has(order.id)),
    [pendingOrders, blockedOrderIds],
  );

  const allSelected =
    selectableOrders.length > 0 &&
    effectiveSelected.size === selectableOrders.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableOrders.map((o) => o.id)));
    }
  };

  const handleSubmit = () => {
    if (!briefId || effectiveSelected.size === 0) return;
    mutation.mutate({ briefId, orderIds: Array.from(effectiveSelected) });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit brief to orders</DialogTitle>
          <DialogDescription>
            Choose the orders awaiting a brief. Submitting starts each
            delivery timeline and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="size-6 text-primary" />
          </div>
        ) : isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <AlertCircle className="mt-0.5 size-4 text-destructive" />
            <span>Unable to load your orders. Please try again.</span>
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            You have no orders awaiting a brief right now.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-muted-foreground">
                {effectiveSelected.size} of {selectableOrders.length} selected
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>

            <ScrollArea className="max-h-[320px] pr-3">
              <div className="flex flex-col gap-2">
                {pendingOrders.map((order) => {
                  const isChecked = effectiveSelected.has(order.id);
                  const isBlocked = blockedOrderIds.has(order.id);
                  return (
                    <label
                      key={order.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition-colors ${
                        isBlocked
                          ? "cursor-default border-amber-300/60 bg-amber-50/40"
                          : isChecked
                            ? "cursor-pointer border-primary/50 bg-primary/5"
                            : "cursor-pointer border-border/40 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(order.id)}
                        className="mt-0.5"
                        disabled={isSubmitting || isBlocked}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-semibold">
                            {order.packageNameSnapshot}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>Order #{shortId(order.id)}</span>
                          {order.paidAt ? (
                            <>
                              <span aria-hidden>·</span>
                              <span>Paid {formatDate(order.paidAt)}</span>
                            </>
                          ) : null}
                          <span aria-hidden>·</span>
                          <span>
                            {formatAmount(
                              order.priceAmountSnapshot,
                              order.currency,
                            )}
                          </span>
                        </div>
                        {briefNeedsTravel ? (
                          <TravelAddOnRow
                            order={order}
                            disabled={isSubmitting}
                          />
                        ) : null}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-600"
                      >
                        Brief required
                      </Badge>
                    </label>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || effectiveSelected.size === 0 || !briefId}
            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 size-4" aria-hidden />
                Submitting…
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Submit to {effectiveSelected.size || 0} order
                {effectiveSelected.size === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
