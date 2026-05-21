"use client";

import { Sparkles } from "lucide-react";

export function CompletedNotificationBanner() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[#F0FDF4] dark:bg-emerald-500/10 p-4 border border-emerald-100 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
        <Sparkles className="size-4" />
      </div>
      <p className="text-sm font-medium">
        You approved the content. Thank you! This order is now completed.
      </p>
    </div>
  );
}
