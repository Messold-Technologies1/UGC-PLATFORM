"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

export function InprogressNotificationBanner({
  creatorName,
  isOrderCompleted = false,
}: {
  creatorName: string;
  isOrderCompleted?: boolean;
}) {
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
    <div className="flex items-center gap-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 p-4 border border-purple-100 dark:border-purple-900/50">
      <Sparkles className="size-5 text-purple-500 shrink-0" />
      <p className="text-sm font-medium text-purple-900 dark:text-purple-300">
        {creatorName} is creating your content. You can message her for updates
        or share additional information.
      </p>
    </div>
  );
}

