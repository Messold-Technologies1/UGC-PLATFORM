"use client";

import { CheckCircle2 } from "lucide-react";
import type { OrderDetailsPublic } from "../../../api/types";
import { OrderCountdownBanner } from "../order-countdown-banner";

export function InprogressNotificationBanner({
  creatorName,
  order,
  isOrderCompleted = false,
}: Readonly<{
  creatorName: string;
  order: OrderDetailsPublic;
  isOrderCompleted?: boolean;
}>) {
  if (isOrderCompleted) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/50">
        <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
          This stage was completed successfully. The creator delivered the
          content and it has been approved.
        </p>
      </div>
    );
  }

  return (
    <OrderCountdownBanner order={order} creatorName={creatorName} />
  );
}
