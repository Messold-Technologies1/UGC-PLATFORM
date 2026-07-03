"use client";

import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import type { OrderDetailsPublic } from "../../../api/types";

interface DeliveredNotificationBannerProps {
  creatorName: string;
  order: OrderDetailsPublic;
  previewPreparing?: boolean;
  isRevision?: boolean;
  isOrderCompleted?: boolean;
  completedAt?: string | null;
}

function formatCompletedDate(val?: string | null): string | null {
  if (!val) return null;
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(val));
  } catch {
    return null;
  }
}

function getReadyToReviewMessage(
  creatorName: string,
  order: OrderDetailsPublic,
): string | null {
  const { status, revisionCount, maxRevisionsSnapshot } = order;
  const revisionsRemaining = Math.max(
    0,
    maxRevisionsSnapshot - revisionCount,
  );
  const isFinalSubmission = revisionsRemaining === 0;

  if (status === "REVISION_REQUESTED") {
    return null;
  }

  if (status === "DELIVERED" && revisionCount === 0) {
    return `${creatorName} has submitted the content for your review. Approve it or request a revision if you'd like changes.`;
  }

  if (status === "REVISION_SUBMITTED" || (status === "DELIVERED" && revisionCount > 0)) {
    if (isFinalSubmission) {
      return `${creatorName} has submitted the final revision. Please review and approve the content.`;
    }
    return `${creatorName} has submitted a revision for your review. Approve it or request another revision if needed.`;
  }

  if (status === "DELIVERED") {
    return `${creatorName} has submitted the content for your review. Approve it or request a revision if you'd like changes.`;
  }

  return null;
}

export function DeliveredNotificationBanner({
  creatorName,
  order,
  previewPreparing = false,
  isRevision = false,
  isOrderCompleted = false,
  completedAt,
}: DeliveredNotificationBannerProps) {
  if (isOrderCompleted) {
    const dateStr = formatCompletedDate(completedAt);
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
          Content was approved and this order was completed successfully.
          {dateStr && ` Approved on ${dateStr}.`}
        </p>
      </div>
    );
  }

  if (previewPreparing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] p-4 dark:bg-primary/10">
        <Sparkles className="size-5 shrink-0 text-primary animate-pulse" />
        <p className="text-sm font-medium text-foreground">
          {isRevision
            ? `${creatorName} just submitted a revision. We're preparing your preview now.`
            : `${creatorName} just submitted the content. We're preparing your preview now.`}
        </p>
      </div>
    );
  }

  if (order.status === "REVISION_REQUESTED") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
        <AlertCircle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
          You&apos;ve requested a revision. {creatorName} is working on updated
          content and will submit it soon.
        </p>
      </div>
    );
  }

  const message = getReadyToReviewMessage(creatorName, order);
  if (!message) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
      <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
        {message}
      </p>
    </div>
  );
}

