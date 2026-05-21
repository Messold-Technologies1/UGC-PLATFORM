"use client";

import { CheckCircle2 } from "lucide-react";

interface DeliveredNotificationBannerProps {
  creatorName: string;
}

export function DeliveredNotificationBanner({
  creatorName,
}: DeliveredNotificationBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4 border border-emerald-100 dark:border-emerald-900/50">
      <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
        {creatorName} has delivered the final content. Please review and approve
        or request revision.
      </p>
    </div>
  );
}
