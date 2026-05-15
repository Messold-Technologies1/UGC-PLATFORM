"use client";

import { CheckCircle2, PartyPopper, X } from "lucide-react";

interface PaymentSuccessBannerProps {
  orderId: string | null;
  creatorName?: string;
  onDismiss: () => void;
}

export function PaymentSuccessBanner({
  orderId,
  creatorName,
  onDismiss,
}: PaymentSuccessBannerProps) {
  const displayOrderId = orderId
    ? `Order #${orderId.substring(0, 8).toUpperCase()}`
    : "Your order";

  return (
    <div className="mb-8 flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex gap-3">
        <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-emerald-900 flex items-center gap-2">
            Payment successful!{" "}
            <PartyPopper className="size-4 text-orange-500" />
          </h3>
          <p className="text-sm text-emerald-800/80 mt-1">
            {displayOrderId} has been created. Now share your brief so{" "}
            {creatorName ?? "the creator"} can make the perfect content for you.
          </p>
        </div>
      </div>
      <button
        className="text-emerald-800/60 hover:text-emerald-900 shrink-0 ml-2"
        onClick={onDismiss}
        aria-label="Dismiss banner"
      >
        <X className="size-5" />
      </button>
    </div>
  );
}
