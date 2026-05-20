"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown, Info, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrderDetailsPublic } from "../../api/types";

interface OrderSummaryCardProps {
  order: OrderDetailsPublic;
  orderId: string;
  briefId?: string | null;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OrderSummaryCard({
  order,
  orderId,
  briefId,
}: OrderSummaryCardProps) {
  const router = useRouter();
  const packageAmount = Number.parseFloat(order.priceAmountSnapshot) || 0;
  const addOnsTotal = Number.parseFloat(order.addOnsTotalSnapshot ?? "0") || 0;
  const totalAmount = order.expectedAmountPaise / 100;
  // const platformFee = 299; 

  const canEditBrief =
    order.status === "BRIEF_SUBMISSION_PENDING" && !order.hasBrief;

  function handleEditBrief() {
    if (canEditBrief) {
      router.push(`/brand/briefs/create?orderId=${orderId}`);
    } else if (briefId) {
      router.push(`/brand/briefs/${briefId}`);
    }
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h3 className="text-lg font-bold text-foreground">Order Summary</h3>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg text-sm font-medium"
          onClick={handleEditBrief}
          disabled={!canEditBrief && !briefId}
        >
          {canEditBrief ? "Edit Brief" : "View Brief"}
        </Button>
      </div>

      <div className="px-6 pb-6">
        <div className="flex flex-col sm:flex-row">
          <div className="flex-1 min-w-0 pr-0 sm:pr-6 sm:w-3/5">
            <p className="text-xs font-semibold text-muted-foreground mb-3">
              Package
            </p>

            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted/50 border border-border/50 overflow-hidden">
                <Package className="size-6 text-muted-foreground" />
              </div>
              <p className="flex-1 text-sm text-foreground min-w-0 truncate">
                {order.packageNameSnapshot}
              </p>
              <p className="text-sm font-semibold text-foreground tabular-nums whitespace-nowrap">
                {formatMoney(packageAmount, order.currency)}
              </p>
            </div>

            {order.addOnsSnapshot.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-semibold text-muted-foreground mb-3">
                  Add-ons
                </p>
                <div className="space-y-2.5">
                  {order.addOnsSnapshot.map((addOn) => (
                    <div
                      key={addOn.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="size-4 text-primary shrink-0" />
                        <span className="text-foreground truncate">
                          {addOn.name}
                        </span>
                      </div>
                      <span className="text-muted-foreground tabular-nums whitespace-nowrap ml-4">
                        {formatMoney(
                          Number.parseFloat(addOn.priceAmount) || 0,
                          order.currency,
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div
            className="hidden sm:block border-l-2 border-solid border-slate-200 dark:border-slate-800 self-stretch"
            aria-hidden="true"
          />

          <div
            className="sm:hidden border-t-2 border-solid border-slate-200 dark:border-slate-800 my-5"
            aria-hidden="true"
          />

          <div className="sm:pl-6 sm:w-2/5 shrink-0 flex flex-col">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground whitespace-nowrap">
                  Package Price
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(packageAmount, order.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground whitespace-nowrap">
                  Add-ons ({order.addOnsSnapshot.length})
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(addOnsTotal, order.currency)}
                </span>
              </div>
              {/* <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground whitespace-nowrap flex items-center gap-1">
                  Platform Fee
                  <Info className="size-3 text-muted-foreground/50" />
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(platformFee, order.currency)}
                </span>
              </div> */}
            </div>

            <div
              className="border-t border-dashed border-slate-300 dark:border-slate-700 my-4"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-foreground">
                Total Paid
              </span>
              <span className="text-lg font-extrabold text-foreground tabular-nums">
                {formatMoney(totalAmount, order.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 pt-2">
        <div className="flex items-start gap-3 rounded-xl bg-[#F6fdf9] dark:bg-emerald-950/30 p-4 border border-emerald-100/50 dark:border-emerald-900/50">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Payment secured
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your payment is held securely and will be released to the creator
              after you approve the final content.
            </p>
          </div>
          <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        </div>
      </div>
    </div>
  );
}
