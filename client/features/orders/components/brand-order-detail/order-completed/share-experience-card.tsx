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
import type { OrderDetailsPublic } from "../../../api/types";
import { useCreateOrderRatingReviewMutation } from "../../../hooks/use-create-order-rating-review-mutation";
import { useGetOrderRatingReviewQuery } from "../../../hooks/use-get-order-rating-review-query";

interface ShareExperienceCardProps {
  order: OrderDetailsPublic;
  creatorName?: string;
}

export function ShareExperienceCard({ order, creatorName = "the creator" }: ShareExperienceCardProps) {
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
    enabled: isReviewable,
    retry: false,
  });

  const createReviewMutation = useCreateOrderRatingReviewMutation({
    onSuccess: () => {
      setIsDialogOpen(false);
      setReview("");
    },
  });

  const existingReview = reviewQuery.data ?? null;
  const canCreateReview = isReviewable && !existingReview;
  const isSubmitting = createReviewMutation.isPending;

  function handleSubmit() {
    if (!canCreateReview || rating < 1 || isSubmitting) return;
    createReviewMutation.mutate({
      orderId: order.id,
      rating,
      review,
    });
  }

  const firstName = creatorName.split(" ")[0] || "the creator";

  return (
    <>
      <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col justify-between h-full">
        <div>
          <h3 className="text-base font-bold text-foreground">Share Your Experience</h3>
          <p className="mt-4 text-sm text-muted-foreground">
            {existingReview 
              ? `You reviewed ${firstName}.` 
              : `How was your experience working with ${firstName}?`}
          </p>
          <div className="flex items-center gap-2 mt-4">
            {existingReview ? (
              <StarRating rating={existingReview.rating} size="md" />
            ) : (
              [1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={!canCreateReview}
                  onClick={() => {
                    setRating(star);
                    setIsDialogOpen(true);
                  }}
                  className={cn(
                    "transition-transform rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    canCreateReview ? "hover:scale-110 cursor-pointer" : "opacity-70 cursor-default"
                  )}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star className="size-7 text-amber-400 fill-amber-400" />
                </button>
              ))
            )}
          </div>
        </div>
        
        {reviewQuery.isLoading ? (
          <div className="mt-6 flex items-center text-sm text-muted-foreground justify-center h-10">
            <Spinner className="mr-2 size-4" aria-hidden />
            Loading...
          </div>
        ) : existingReview ? (
          <div className="mt-6 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground italic truncate">
            &quot;{existingReview.review?.trim() || "No written review"}&quot;
          </div>
        ) : canCreateReview ? (
          <Button
            variant="outline"
            className="w-full mt-6 rounded-lg text-primary border-primary/20 hover:bg-primary/5 font-semibold"
            onClick={() => setIsDialogOpen(true)}
          >
            Write a Review
          </Button>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground text-center">
            You cannot review this order yet.
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
