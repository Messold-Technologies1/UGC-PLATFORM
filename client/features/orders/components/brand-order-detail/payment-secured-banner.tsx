"use client";

import { ShieldCheck } from "lucide-react";

export function PaymentSecuredBanner() {
  return (
    <div className="rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/50 p-5 mt-auto">
      <div className="flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
            Your payment is secured
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
            Payment will be released to the creator only after you approve the final content.
          </p>
        </div>
      </div>
    </div>
  );
}
