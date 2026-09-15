"use client";

import { MessageSquareQuote, Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { useGetOrderRatingReviewQuery } from "@/features/orders/hooks/use-get-order-rating-review-query";

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function AdminOrderReviewCard({ orderId }: { orderId: string }) {
  const { data: review, isLoading, isError } = useGetOrderRatingReviewQuery(
    orderId,
    { retry: false },
  );

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <MessageSquareQuote className="size-5 text-primary" />
        <h2 className="font-headline text-xl font-bold">Review</h2>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          We could not load this order&apos;s review right now.
        </p>
      ) : review ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size="md" />
              <span className="text-sm font-semibold text-foreground">
                {review.rating}/5
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {review.brand.brandName?.trim() || "Brand"}
              {formatDate(review.createdAt)
                ? ` · ${formatDate(review.createdAt)}`
                : ""}
            </p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {review.review?.trim() || "No written review."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center">
          <Star className="mb-2 size-5 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No review yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            The brand has not rated this creator for this order.
          </p>
        </div>
      )}
    </div>
  );
}
