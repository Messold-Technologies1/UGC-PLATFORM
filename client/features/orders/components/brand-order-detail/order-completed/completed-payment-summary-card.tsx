"use client";

import { CheckCircle2 } from "lucide-react";
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

function formatReleaseDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}, ${d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
}

export function CompletedPaymentSummaryCard({
  order,
}: CompletedPaymentSummaryCardProps) {
  const basePackageAmount = Number.parseFloat(order.priceAmountSnapshot) || 0;
  const addOnsTotal = Number.parseFloat(order.addOnsTotalSnapshot ?? "0") || 0;
  const totalPaid = order.expectedAmountPaise / 100;

  const releaseDateStr = formatReleaseDate(order.creatorPaidAt || order.acceptedAt || new Date().toISOString());

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

      <div className="flex items-center justify-between gap-3 mb-6">
        <span className="text-sm font-bold text-foreground">Total Paid</span>
        <span className="text-2xl font-bold text-primary tabular-nums tracking-tight">
          {formatMoney(totalPaid, order.currency)}
        </span>
      </div>

      <div className="rounded-lg bg-[#F0FDF4] dark:bg-emerald-500/10 p-4 border border-emerald-100 dark:border-emerald-500/20">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1.5">
          <CheckCircle2 className="size-4" />
          <span className="text-sm font-bold">Payment Released</span>
        </div>
        <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed pl-6">
          Payment has been released to the creator on<br />
          {releaseDateStr}
        </p>
      </div>
    </div>
  );
}
