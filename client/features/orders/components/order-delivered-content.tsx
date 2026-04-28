"use client";

import { useState } from "react";
import { CheckCircle, FileEdit, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { ThumbnailsCarousel } from "@/components/ui/thumbnails-carousel";
import { cn } from "@/lib/utils";
import { useAcceptOrderDeliveryMutation } from "../hooks/use-accept-order-delivery-mutation";
import { useRequestOrderRevisionMutation } from "../hooks/use-request-order-revision-mutation";
import type { OrderDetailsPublic } from "../api/types";

interface OrderDeliveredContentProps {
  order?: OrderDetailsPublic;
}

export function OrderDeliveredContent({ order }: OrderDeliveredContentProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const acceptOrderDeliveryMutation = useAcceptOrderDeliveryMutation({
    onSuccess: () => setIsApproveDialogOpen(false),
  });
  const requestOrderRevisionMutation = useRequestOrderRevisionMutation({
    onSuccess: () => setIsRevisionDialogOpen(false),
  });

  if (!order) return null;

  const orderId = order.id;
  const canReviewDelivery =
    order.status === "DELIVERED" || order.status === "REVISION_SUBMITTED";
  const isAccepted = ["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(order.status);
  const hasRevisionsRemaining =
    order.revisionCount < order.maxRevisionsSnapshot;
  const canRequestRevision = canReviewDelivery && hasRevisionsRemaining;
  const isActionPending =
    acceptOrderDeliveryMutation.isPending ||
    requestOrderRevisionMutation.isPending;
  const reviewStatusLabel = isAccepted
    ? "Completed"
    : canReviewDelivery
      ? "Ready for review"
      : "Awaiting delivery";

  function handleApproveDelivery() {
    if (!canReviewDelivery || isActionPending) {
      return;
    }

    acceptOrderDeliveryMutation.mutate({ orderId });
  }

  function handleRequestRevision() {
    if (!canRequestRevision || isActionPending) {
      return;
    }

    requestOrderRevisionMutation.mutate({ orderId });
  }

  return (
    <>
      <section className="bg-card rounded-3xl overflow-hidden border shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-muted/30 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-foreground" />
            <h2 className="text-lg font-bold text-foreground">Delivered Content</h2>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "w-fit rounded-full px-3 py-1 text-[11px] font-semibold",
              isAccepted
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                : canReviewDelivery
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border/70 bg-muted text-muted-foreground",
            )}
          >
            {reviewStatusLabel}
          </Badge>
        </div>

        <div className="p-6 md:p-8">
          <ThumbnailsCarousel />

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Button
              type="button"
              disabled={!canReviewDelivery || isActionPending}
              onClick={() => setIsApproveDialogOpen(true)}
              className="w-full py-4 font-bold shadow-lg shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            >
              <CheckCircle className="w-5 h-5" />
              {isAccepted ? "Approved" : "Approve"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canRequestRevision || isActionPending}
              onClick={() => setIsRevisionDialogOpen(true)}
              className="w-full px-8 py-4 font-semibold hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <FileEdit className="w-5 h-5" />
              {hasRevisionsRemaining ? "Request Revision" : "No Revisions Left"}
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        open={isApproveDialogOpen}
        onOpenChange={(open) => {
          if (!open && isActionPending) {
            return;
          }

          setIsApproveDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={!isActionPending}>
          <DialogHeader>
            <DialogTitle>Approve delivered content?</DialogTitle>
            <DialogDescription>
              This will mark the order as completed for the brand.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isActionPending}
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleApproveDelivery}
              disabled={!canReviewDelivery || isActionPending}
            >
              {acceptOrderDeliveryMutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Approving...
                </>
              ) : (
                "Approve"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isRevisionDialogOpen}
        onOpenChange={(open) => {
          if (!open && isActionPending) {
            return;
          }

          setIsRevisionDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={!isActionPending}>
          <DialogHeader>
            <DialogTitle>Request a revision?</DialogTitle>
            <DialogDescription>
              This will send the delivery back to the creator for another
              submission. {order.maxRevisionsSnapshot - order.revisionCount}{" "}
              revision
              {order.maxRevisionsSnapshot - order.revisionCount === 1 ? "" : "s"}{" "}
              remaining.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isActionPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              onClick={handleRequestRevision}
              disabled={!canRequestRevision || isActionPending}
            >
              {requestOrderRevisionMutation.isPending ? (
                <>
                  <Spinner className="size-4" aria-hidden />
                  Requesting...
                </>
              ) : (
                "Request Revision"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
