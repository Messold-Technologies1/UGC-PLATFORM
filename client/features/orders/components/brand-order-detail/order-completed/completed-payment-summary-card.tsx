"use client";

import type { OrderDetailsPublic } from "../../../api/types";

interface CompletedPaymentSummaryCardProps {
  order: OrderDetailsPublic;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CompletedPaymentSummaryCard({
  order,
}: CompletedPaymentSummaryCardProps) {
  const basePackageAmount = Number.parseFloat(order.priceAmountSnapshot) || 0;
  const addOnsTotal = Number.parseFloat(order.addOnsTotalSnapshot ?? "0") || 0;
  const totalPaid = order.expectedAmountPaise / 100;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col h-full">
      <h3 className="text-base font-bold text-foreground mb-6">Payment Summary</h3>

      <div className="space-y-4 text-sm flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-medium">Base Package</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatMoney(basePackageAmount, order.currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground font-medium">
            Add-ons ({order.addOnsSnapshot.length})
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatMoney(addOnsTotal, order.currency)}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 my-5" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-foreground">Total Paid</span>
        <span className="text-2xl font-bold text-primary tabular-nums tracking-tight">
          {formatMoney(totalPaid, order.currency)}
        </span>
      </div>
    </div>
  );
}
