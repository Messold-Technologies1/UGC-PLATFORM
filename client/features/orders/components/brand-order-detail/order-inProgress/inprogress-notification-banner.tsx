"use client";

import { Sparkles } from "lucide-react";

export function InprogressNotificationBanner({
  creatorName,
}: {
  creatorName: string;
}) {
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
