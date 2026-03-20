import { memo } from "react";
import { Star } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import type { Review } from "../types";

interface ReviewsTabProps {
  reviews: Review[];
  overallRating: number;
  totalReviews: number;
}

export const ReviewsTab = memo(function ReviewsTab({ reviews, overallRating, totalReviews }: ReviewsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="text-center">
          <p className="text-4xl font-bold">{overallRating}</p>
          <div className="mt-1">
            <StarRating rating={overallRating} size="md" />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{totalReviews} reviews</p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter((r) => Math.round(r.rating) === stars).length;
            const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right text-muted-foreground">{stars}</span>
                <Star className="size-3 fill-amber-400 text-amber-400" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-xl border border-border bg-card p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {review.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{review.author}</p>
                  <p className="text-xs text-muted-foreground">{review.brand} · {review.date}</p>
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {review.comment}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});
