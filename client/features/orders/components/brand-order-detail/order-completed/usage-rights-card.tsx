"use client";

import { useState } from "react";
import { CalendarClock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useBuyExtraUsageRights } from "@/features/payments/hooks/use-buy-extra-usage-rights";
import type { OrderDetailsPublic } from "../../../api/types";

interface UsageRightsCardProps {
  orderId: string;
  order: OrderDetailsPublic;
  className?: string;
}

/**
 * Post-completion CTA: the brand extends content usage rights in non-refundable
 * 30-day blocks. Shows the current total window (base + purchased), a quantity
 * stepper, the live total price, and a clear "non-refundable" warning.
 */
export function UsageRightsCard({ orderId, order, className }: UsageRightsCardProps) {
  const { isGatewayReady, isProcessing, buyUsageRights } =
    useBuyExtraUsageRights(orderId);
  const [qty, setQty] = useState(1);

  const daysPerBlock = order.usageRightsPerPurchase || 30;
  const currentTotalDays =
    (order.usageRightsBaseDays || 0) + (order.usageRightsExtraDays || 0);
  const unitPrice =
    order.usageRightsAddOnUnitPaise != null
      ? order.usageRightsAddOnUnitPaise / 100
      : null;

  // Only render when the backend says this order can buy the extension.
  if (!order.usageRightsAddOnAvailable || unitPrice == null) return null;

  const totalPrice = unitPrice * qty;
  const addedDays = daysPerBlock * qty;

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-6 shadow-sm flex flex-col",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <CalendarClock className="size-4 text-primary" />
        <h3 className="text-base font-bold text-foreground">Extend usage rights</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        This order currently includes{" "}
        <strong className="text-foreground">{currentTotalDays} days</strong> of
        content usage rights. Add more time in {daysPerBlock}-day blocks.
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">Blocks</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="size-8 rounded-lg p-0"
            disabled={isProcessing || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Fewer blocks"
          >
            −
          </Button>
          <span className="w-6 text-center text-sm font-semibold tabular-nums">
            {qty}
          </span>
          <Button
            type="button"
            variant="outline"
            className="size-8 rounded-lg p-0"
            disabled={isProcessing}
            onClick={() => setQty((q) => q + 1)}
            aria-label="More blocks"
          >
            +
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          +{addedDays} days
        </span>
        <span className="font-semibold text-foreground tabular-nums">
          ₹{totalPrice.toLocaleString("en-IN")}
        </span>
      </div>

      <Button
        className="w-full font-semibold h-11 rounded-xl mt-4"
        disabled={!isGatewayReady || isProcessing}
        onClick={() => void buyUsageRights(qty)}
      >
        {isProcessing ? (
          <Spinner className="size-4 mr-1.5" />
        ) : (
          <ShieldCheck className="size-4 mr-1.5" />
        )}
        Add {addedDays} days · ₹{totalPrice.toLocaleString("en-IN")}
      </Button>

      <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
        <span aria-hidden>⚠️</span>
        <span>
          Usage-rights extensions are <strong>non-refundable</strong> — choose
          your quantity carefully before paying.
        </span>
      </p>
    </div>
  );
}
