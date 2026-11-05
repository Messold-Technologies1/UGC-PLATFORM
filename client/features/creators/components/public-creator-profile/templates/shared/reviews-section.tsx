"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicProfileReviews } from "../types";

type ReviewsSectionProps = {
  reviews: PublicProfileReviews;
  /** Heading node, so each template keeps its own type treatment. */
  heading: React.ReactNode;
  cardClassName?: string;
  className?: string;
};

/**
 * Brand reviews block.
 *
 * None of the eight designs drew one, so this is a house pattern applied
 * consistently: templates supply the heading and card paint, and the block is
 * only rendered when the creator actually has reviews.
 */
export function ReviewsSection({
  reviews,
  heading,
  cardClassName,
  className,
}: ReviewsSectionProps) {
  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        {heading}
        <span className="flex items-center gap-1.5 text-[15px] text-gc-muted-soft">
          <Star className="size-4 fill-gc-brand text-gc-brand" />
          <b className="text-gc-ink">{reviews.average.toFixed(1)}</b>
          Based on {reviews.count} verified{" "}
          {reviews.count === 1 ? "order" : "orders"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {reviews.items.map((review) => (
          <div
            key={review.id}
            className={cn(
              "flex flex-col gap-3 rounded-gc-md bg-gc-surface p-5",
              cardClassName,
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gc-ink text-sm font-bold text-white">
                {review.authorInitial}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold">
                  {review.authorLabel}
                </div>
                {review.packageLabel && (
                  <div className="truncate text-[13px] text-gc-muted">
                    {review.packageLabel}
                  </div>
                )}
              </div>
              <span className="flex items-center gap-1 text-sm font-bold">
                <Star className="size-3.5 fill-gc-brand text-gc-brand" />
                {review.rating.toFixed(1)}
              </span>
            </div>
            {review.comment && (
              <p className="m-0 text-pretty text-[15px] leading-relaxed text-gc-ink-muted">
                {review.comment}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
