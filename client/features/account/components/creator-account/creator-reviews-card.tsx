"use client";

import { Star, MessageSquare } from "lucide-react";
import type { CreatorRatingReviewApi } from "@/features/creators/api/types";

export function CreatorReviewsCard({ reviews }: { reviews?: CreatorRatingReviewApi[] }) {
  return (
    <div id="top-reviews" className="rounded-lg border border-border bg-card p-5 shadow-sm flex flex-col h-full scroll-mt-24">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-foreground">Top Reviews</h3>
      </div>
      
      {reviews && reviews.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 flex-1">
          {reviews.map((review, index) => (
            <div key={review.id || `review-${index}`} className="rounded-xl border border-border/70 bg-background/40 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`size-3.5 ${i < review.rating ? "fill-amber-500" : "fill-muted text-muted"}`} />
                  ))}
                </div>
                <span className="text-xs font-semibold">{review.brand.brandName}</span>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {review.review || "Great experience working with this creator!"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 bg-muted/30 flex-1 min-h-[140px]">
          <MessageSquare className="size-6 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-foreground">No reviews yet</p>
          <p className="text-xs text-muted-foreground mt-1 text-center">Complete orders to receive reviews.</p>
        </div>
      )}
    </div>
  );
}
