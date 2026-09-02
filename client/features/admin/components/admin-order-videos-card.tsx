"use client";

import { useMemo, useRef } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Film } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import { useAdminOrderDeliveriesQuery } from "../api/get-admin-order-deliveries";
import type {
  OrderDeliveryAsset,
  OrderDeliveryItem,
} from "@/features/orders/api/get-brand-order-deliveries";

function toCarouselAssets(assets: OrderDeliveryAsset[]): CarouselAsset[] {
  return assets
    .filter((a) => a.url && (a.kind === "video" || a.kind === "image"))
    .map((a) => ({ id: a.key, type: a.kind, full: a.url, thumb: a.url }));
}

function deliveryLabel(item: OrderDeliveryItem, isLatest: boolean): string {
  if (item.revisionsUsed <= 0) {
    return isLatest ? "Delivery" : "Initial delivery";
  }
  return `Revision ${item.revisionsUsed}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

/**
 * Admin-only card showing every delivery (initial + revisions) for an order in
 * a horizontal carousel — swipe/scroll between deliveries. The accepted
 * delivery (the latest one, once `acceptedAt` is set) gets an "Approved" badge.
 */
export function AdminOrderVideosCard({
  orderId,
  acceptedAt,
}: {
  orderId: string;
  acceptedAt?: string | null;
}) {
  const { data, isLoading, isError } = useAdminOrderDeliveriesQuery(orderId);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Backend returns oldest→newest; show newest first.
  const items = useMemo(() => [...(data?.items ?? [])].reverse(), [data]);
  const latestId = items[0]?.id;
  const isApproved = Boolean(acceptedAt);

  const scrollByOne = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstSlide = el.firstElementChild as HTMLElement | null;
    const amount = firstSlide ? firstSlide.offsetWidth + 16 : el.clientWidth * 0.9;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <Film className="size-5 text-primary" />
        <h2 className="font-headline text-xl font-bold">Order Videos</h2>
        {data ? (
          <span className="text-sm text-muted-foreground">
            ({items.length})
          </span>
        ) : null}
        {items.length > 1 ? (
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Previous video"
              onClick={() => scrollByOne(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Next video"
              onClick={() => scrollByOne(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          We could not load this order&apos;s videos right now.
        </p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No videos have been delivered for this order yet.
        </p>
      ) : (
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
        >
          {items.map((item) => {
            const carouselAssets = toCarouselAssets(item.assets);
            const isLatest = item.id === latestId;
            const showApproved = isLatest && isApproved;
            return (
              <div
                key={item.id}
                className="w-[88%] shrink-0 snap-start sm:w-[440px] lg:w-[520px]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <h3 className="font-bold">{deliveryLabel(item, isLatest)}</h3>
                  {showApproved ? (
                    <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                      <CheckCircle2 className="size-3.5" />
                      Approved
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(item.createdAt)} · {carouselAssets.length}{" "}
                    {carouselAssets.length === 1 ? "file" : "files"}
                  </span>
                </div>
                {carouselAssets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No playable assets in this delivery.
                  </p>
                ) : (
                  <ThumbnailsCarousel
                    assets={carouselAssets}
                    itemGroupClassName="aspect-auto h-[263px]"
                  />
                )}
                {item.note ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      Note:{" "}
                    </span>
                    {item.note}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
