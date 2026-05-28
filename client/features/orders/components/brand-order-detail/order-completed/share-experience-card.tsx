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
  const [hoverRating, setHoverRating] = useState<number | null>(null);
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
              [1, 2, 3, 4, 5].map((star) => {
                const current = hoverRating ?? 0;
                const isFull = current >= star;
                const isHalf = current >= star - 0.5 && current < star;

                return (
                  <div key={star} className={cn(
                    "relative size-7 transition-transform",
                    canCreateReview && "hover:scale-110"
                  )}>
                    <Star 
                      className={cn(
                        "size-7 transition-colors", 
                        isFull || isHalf ? "text-amber-400" : "text-muted-foreground",
                        isFull ? "fill-amber-400" : "fill-transparent"
                      )} 
                    />
                    
                    {isHalf && (
                      <span className="absolute inset-0 w-1/2 overflow-hidden pointer-events-none">
                        <Star className="size-7 fill-amber-400 text-amber-400" />
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={!canCreateReview}
                      onMouseEnter={() => canCreateReview && setHoverRating(star - 0.5)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => { setRating(star - 0.5); setIsDialogOpen(true); }}
                      className="absolute left-0 inset-y-0 w-1/2 z-10 cursor-pointer focus-visible:outline-none"
                      aria-label={`Rate ${star - 0.5} stars`}
                    />
                    <button
                      type="button"
                      disabled={!canCreateReview}
                      onMouseEnter={() => canCreateReview && setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => { setRating(star); setIsDialogOpen(true); }}
                      className="absolute right-0 inset-y-0 w-1/2 z-10 cursor-pointer focus-visible:outline-none"
                      aria-label={`Rate ${star} stars`}
                    />
                  </div>
                );
              })
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
            className="w-full mt-6 rounded-xl text-sm font-semibold h-11"
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
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const current = hoverRating !== null ? hoverRating : rating;
                const isFull = current >= star;
                const isHalf = current >= star - 0.5 && current < star;

                return (
                  <div key={star} className={cn(
                    "relative size-9 flex items-center justify-center transition-transform rounded-md",
                    !isSubmitting && "hover:bg-muted hover:scale-110"
                  )}>
                    <Star 
                      className={cn(
                        "size-7 transition-colors", 
                        isFull || isHalf ? "text-amber-400" : "text-muted-foreground/30",
                        isFull ? "fill-amber-400" : "fill-transparent"
                      )} 
                    />
                    
                    {isHalf && (
                      <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden pointer-events-none flex items-center justify-start pl-1">
                        <Star className="size-7 shrink-0 fill-amber-400 text-amber-400" />
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onMouseEnter={() => !isSubmitting && setHoverRating(star - 0.5)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star - 0.5)}
                      className="absolute left-0 inset-y-0 w-1/2 z-10 cursor-pointer focus-visible:outline-none rounded-l-md"
                      aria-label={`Rate ${star - 0.5} stars`}
                    />
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onMouseEnter={() => !isSubmitting && setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="absolute right-0 inset-y-0 w-1/2 z-10 cursor-pointer focus-visible:outline-none rounded-r-md"
                      aria-label={`Rate ${star} stars`}
                    />
                  </div>
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
