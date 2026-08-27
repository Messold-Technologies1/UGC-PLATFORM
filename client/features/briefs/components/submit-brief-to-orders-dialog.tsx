"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Package, Send } from "lucide-react";
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
import type { AttachBriefToOrdersResponse } from "@/features/briefs/api/attach-brief-to-orders";

const PENDING_STATUS = "BRIEF_SUBMISSION_PENDING";

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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const allSelected =
    pendingOrders.length > 0 && selected.size === pendingOrders.length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingOrders.map((o) => o.id)));
    }
  };

  const handleSubmit = () => {
    if (!briefId || selected.size === 0) return;
    mutation.mutate({ briefId, orderIds: Array.from(selected) });
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
                {selected.size} of {pendingOrders.length} selected
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
                  const isChecked = selected.has(order.id);
                  return (
                    <label
                      key={order.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                        isChecked
                          ? "border-primary/50 bg-primary/5"
                          : "border-border/40 hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(order.id)}
                        className="mt-0.5"
                        disabled={isSubmitting}
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
            disabled={isSubmitting || selected.size === 0 || !briefId}
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
                Submit to {selected.size || 0} order
                {selected.size === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
