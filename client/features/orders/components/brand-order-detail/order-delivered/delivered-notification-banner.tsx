"use client";

import { CheckCircle2, Sparkles } from "lucide-react";

interface DeliveredNotificationBannerProps {
  creatorName: string;
  previewPreparing?: boolean;
  isRevision?: boolean;
}

export function DeliveredNotificationBanner({
  creatorName,
  previewPreparing = false,
  isRevision = false,
}: DeliveredNotificationBannerProps) {
  if (previewPreparing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] p-4 dark:bg-primary/10">
        <Sparkles className="size-5 shrink-0 text-primary animate-pulse" />
        <p className="text-sm font-medium text-foreground">
          {isRevision
            ? `${creatorName} just submitted a revision. We're preparing your preview now.`
            : `${creatorName} just delivered content. We're preparing your preview now.`}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
        {creatorName} has delivered the final content. Please review and approve
        or request revision.
      </p>
    </div>
  );
}
