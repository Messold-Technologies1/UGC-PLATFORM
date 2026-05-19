"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { OrderDetailsPublic } from "../api/types";
import { useCreateOrderRatingReviewMutation } from "../hooks/use-create-order-rating-review-mutation";
import { useGetOrderRatingReviewQuery } from "../hooks/use-get-order-rating-review-query";

interface OrderRatingReviewCardProps {
  order: OrderDetailsPublic;
  role: "brand" | "creator";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function OrderRatingReviewCard({
  order,
  role,
}: OrderRatingReviewCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const isReviewable = useMemo(() => {
    if (!["ACCEPTED", "CREATOR_PAYMENT_DONE", "REJECTED"].includes(order.status)) {
      return false;
    }
    return order.status === "REJECTED" || Boolean(order.acceptedAt);
  }, [order.acceptedAt, order.status]);
  const reviewQuery = useGetOrderRatingReviewQuery(order.id, {
    enabled: isReviewable || role === "creator",
    retry: false,
  });
  const createReviewMutation = useCreateOrderRatingReviewMutation({
    onSuccess: () => {
      setIsDialogOpen(false);
      setReview("");
    },
  });
  const existingReview = reviewQuery.data ?? null;
  const canCreateReview = role === "brand" && isReviewable && !existingReview;
  const isSubmitting = createReviewMutation.isPending;

  function handleSubmit() {
    if (!canCreateReview || rating < 1 || isSubmitting) return;
    createReviewMutation.mutate({
      orderId: order.id,
      rating,
      review,
    });
  }

  if (!isReviewable && !existingReview) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Creator Review
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {existingReview
                ? `Reviewed ${formatDate(existingReview.createdAt) ?? "recently"}`
                : "Rate this order once the collaboration is complete."}
            </p>
          </div>
          {existingReview ? (
            <StarRating rating={existingReview.rating} size="md" />
          ) : null}
        </div>

        {reviewQuery.isLoading ? (
          <div className="mt-4 flex items-center text-sm text-muted-foreground">
            <Spinner className="mr-2 size-4" aria-hidden />
            Loading review...
          </div>
        ) : existingReview ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {existingReview.review?.trim() || "No written review."}
            </p>
            {existingReview.packageNameSnapshot ? (
              <p className="text-xs text-muted-foreground">
                {existingReview.packageNameSnapshot}
              </p>
            ) : null}
          </div>
        ) : canCreateReview ? (
          <Button
            type="button"
            className="mt-4 w-full rounded-lg font-semibold"
            onClick={() => setIsDialogOpen(true)}
          >
            Rate Creator
          </Button>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No review has been submitted for this order yet.
          </p>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && isSubmitting) return;
          setIsDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={!isSubmitting}>
          <DialogHeader>
            <DialogTitle>Rate this creator</DialogTitle>
            <DialogDescription>
              Your review will appear on the creator&apos;s profile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setRating(value)}
                    className="rounded-md p-1 text-amber-400 transition hover:bg-muted disabled:opacity-60"
                    aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                  >
                    <Star
                      className={cn(
                        "size-7",
                        value <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <Textarea
              value={review}
              onChange={(event) => setReview(event.target.value)}
              disabled={isSubmitting}
              maxLength={5000}
              className="min-h-28 resize-y"
              placeholder="Share a few details about communication, quality, or delivery."
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canCreateReview || rating < 1 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Submitting...
                </>
              ) : (
                "Submit Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
