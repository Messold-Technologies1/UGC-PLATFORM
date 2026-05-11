"use client";

import { useState } from "react";
import { CheckCircle, ExternalLink, FileEdit, PlayCircle } from "lucide-react";
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
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAcceptOrderDeliveryMutation } from "../hooks/use-accept-order-delivery-mutation";
import { useGetBrandOrderDeliveriesQuery } from "../hooks/use-get-brand-order-deliveries-query";
import { useRequestOrderRevisionMutation } from "../hooks/use-request-order-revision-mutation";
import type { OrderDetailsPublic } from "../api/types";

interface OrderDeliveredContentProps {
  order?: OrderDetailsPublic;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function OrderDeliveredContent({ order }: OrderDeliveredContentProps) {
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const orderId = order?.id ?? "";
  const acceptOrderDeliveryMutation = useAcceptOrderDeliveryMutation({
    onSuccess: () => setIsApproveDialogOpen(false),
  });
  const requestOrderRevisionMutation = useRequestOrderRevisionMutation({
    onSuccess: () => setIsRevisionDialogOpen(false),
  });
  const deliveriesQuery = useGetBrandOrderDeliveriesQuery(orderId, {
    enabled: Boolean(orderId),
  });

  if (!order) return null;

  const canReviewDelivery =
    order.status === "DELIVERED" || order.status === "REVISION_SUBMITTED";
  const isAccepted = ["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(order.status);
  const hasRevisionsRemaining =
    order.revisionCount < order.maxRevisionsSnapshot;
  const canRequestRevision = canReviewDelivery && hasRevisionsRemaining;
  const revisionsLeft = Math.max(
    order.maxRevisionsSnapshot - order.revisionCount,
    0,
  );
  const isActionPending =
    acceptOrderDeliveryMutation.isPending ||
    requestOrderRevisionMutation.isPending;
  const reviewStatusLabel = isAccepted
    ? "Completed"
    : canReviewDelivery
      ? "Ready for review"
      : "Awaiting delivery";
  const deliveries = deliveriesQuery.data?.items ?? [];
  const latestDelivery = deliveries.at(-1);
  const revisionsUsed = latestDelivery?.revisionsUsed ?? order.revisionCount;
  const latestAssets: CarouselAsset[] =
    latestDelivery?.assets.map((asset) => ({
      id: asset.key,
      type: asset.kind,
      full: asset.url,
      thumb: asset.url,
    })) ?? [];
  const hasDeliveryAssets = latestAssets.length > 0;

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
      <section className="bg-card rounded-3xl flex flex-col h-160 overflow-hidden border shadow-sm">
        <div className="flex flex-col gap-4 border-b bg-muted/30 p-5 md:flex-row md:items-center md:justify-between shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          {deliveriesQuery.isLoading ? (
            <div className="flex aspect-video items-center justify-center rounded-2xl border bg-muted/20 text-sm text-muted-foreground">
              <Spinner className="mr-2 size-4" aria-hidden />
              Loading delivery...
            </div>
          ) : latestDelivery && hasDeliveryAssets ? (
            <div className="space-y-6">
              <ThumbnailsCarousel assets={latestAssets} />

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {latestDelivery.revisionsUsed === 0
                        ? "Initial delivery"
                        : `Revision ${latestDelivery.revisionsUsed}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDate(latestDelivery.createdAt) ?? "recently"}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full">
                    {latestDelivery.assets.length} asset
                    {latestDelivery.assets.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                {latestDelivery.note ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {latestDelivery.note}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {latestDelivery.assets.map((asset, index) => (
                    <Button
                      key={asset.key}
                      asChild
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      <a href={asset.url} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-4 h-4" />
                        {asset.kind === "video" ? "Video" : "Image"} {index + 1}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : deliveriesQuery.isError ? (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 px-6 text-center text-sm text-destructive">
              Unable to load delivered assets.
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              No delivery assets submitted yet.
            </div>
          )}

          <div className="mt-auto pt-8 flex flex-col items-center gap-4 sm:flex-row shrink-0">
            <Button
              type="button"
              disabled={!canReviewDelivery || isActionPending}
              onClick={() => setIsApproveDialogOpen(true)}
              className="w-full py-4 font-bold shadow-lg shadow-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-1"
            >
              <CheckCircle className="w-5 h-5" />
              {isAccepted ? "Approved" : "Approve"}
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canRequestRevision || isActionPending}
                    onClick={() => setIsRevisionDialogOpen(true)}
                    className="w-full px-8 py-4 font-semibold hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    <FileEdit className="w-5 h-5" />
                    {hasRevisionsRemaining
                      ? "Request Revision"
                      : "No Revisions Left"}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-center">
                {revisionsUsed} used / {order.maxRevisionsSnapshot} total ·{" "}
                {revisionsLeft} left
              </TooltipContent>
            </Tooltip>
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
