"use client";

import { Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ORDER_REVIEW_SECTION_ID = "order-review";

export function CompletedNotificationBanner() {
  function scrollToReview() {
    document
      .getElementById(ORDER_REVIEW_SECTION_ID)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-100 bg-[#F0FDF4] p-4 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <Sparkles className="size-4" />
        </div>
        <p className="text-sm font-medium">
          You approved the content. Thank you! This order is now completed.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={scrollToReview}
        className="h-9 shrink-0 rounded-lg border-emerald-200 bg-white px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
      >
        <Star className="mr-1.5 size-3.5" />
        Please rate your experience
      </Button>
    </div>
  );
}
