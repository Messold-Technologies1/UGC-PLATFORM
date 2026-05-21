"use client";

import {
  Download,
  Eye,
  FileVideo,
  Image as ImageIcon,
  MoreVertical,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBrandOrderDeliveriesQuery } from "../../../hooks/use-get-brand-order-deliveries-query";
import type { OrderDeliveryAsset } from "../../../api/get-brand-order-deliveries";
import { ThumbnailsCarousel, type CarouselAsset } from "@/components/ui/thumbnails-carousel";

interface DeliveredVideosCardProps {
  orderId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Extract a human-readable filename from the S3-style key. */
function filenameFromKey(key: string): string {
  const segments = key.split("/");
  return segments[segments.length - 1] ?? key;
}

/** Format an ISO date string to a readable delivery date. */
function formatDeliveryDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `Delivered on ${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
}

/** Open a URL in a new tab. */
function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Trigger a download for a given URL. */
function downloadAsset(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */



function AdditionalFileRow({
  asset,
}: {
  asset: OrderDeliveryAsset;
}) {
  const filename = filenameFromKey(asset.key);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5 min-w-0">
        <ImageIcon className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-foreground truncate">{filename}</span>
      </div>
      <button
        type="button"
        onClick={() => downloadAsset(asset.url, filename)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted shrink-0"
        aria-label={`Download ${filename}`}
      >
        <Download className="size-4" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DeliveredVideosSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <div className="flex gap-5">
        <Skeleton className="aspect-video w-[220px] rounded-xl" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-56" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function DeliveredVideosCard({ orderId }: DeliveredVideosCardProps) {
  const { data, isLoading, isError } =
    useGetBrandOrderDeliveriesQuery(orderId);

  if (isLoading) {
    return <DeliveredVideosSkeleton />;
  }

  const deliveries = data?.items ?? [];
  const latestDelivery = deliveries.at(-1);
  const allAssets = latestDelivery?.assets ?? [];
  const videoAssets = allAssets.filter((a) => a.kind === "video");
  const imageAssets = allAssets.filter((a) => a.kind === "image");
  const primaryVideo = videoAssets[0];
  const videoCount = videoAssets.length;

  const carouselAssets: CarouselAsset[] = allAssets.map((asset) => ({
    id: asset.key,
    type: asset.kind,
    full: asset.url,
    thumb: asset.url,
  }));

  if (isError) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm text-destructive">
          Unable to load delivered content. Please try again later.
        </p>
      </div>
    );
  }

  const isEmpty = !latestDelivery || allAssets.length === 0;

  const primaryFilename = primaryVideo
    ? filenameFromKey(primaryVideo.key)
    : "Pending Delivery...";

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-foreground">Delivered Videos</h3>
        <Badge
          variant="outline"
          className="rounded-full bg-primary/5 text-primary border-primary/20 text-xs font-semibold px-3 py-0.5"
        >
          {videoCount} Video{videoCount !== 1 ? "s" : ""} Delivered
        </Badge>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col sm:flex-row gap-5">
          {/* Media Carousel */}
          <div className="shrink-0 w-full sm:w-[280px]">
            {isEmpty || carouselAssets.length === 0 ? (
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted/50 border border-border/50 flex flex-col items-center justify-center text-muted-foreground/50">
                <FileVideo className="size-8 mb-2" />
                <span className="text-xs font-medium">No media</span>
              </div>
            ) : (
              <ThumbnailsCarousel assets={carouselAssets} />
            )}
          </div>

          {/* File details */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileVideo className={`size-4 shrink-0 ${isEmpty ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
              <h4 className={`text-sm font-bold truncate ${isEmpty ? "text-muted-foreground/60" : "text-foreground"}`}>
                {primaryFilename}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isEmpty ? "-- • -- • --" : "1080p • 60 sec • 86.4 MB"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEmpty ? "Not delivered yet" : formatDeliveryDate(latestDelivery?.createdAt)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 mt-4">
            <Button
              size="sm"
              className="rounded-lg font-semibold text-xs px-4 h-9"
              onClick={() => primaryVideo && openInNewTab(primaryVideo.url)}
              disabled={isEmpty}
            >
              <Eye className="size-3.5 mr-1.5" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg font-semibold text-xs px-4 h-9"
              onClick={() =>
                primaryVideo && downloadAsset(primaryVideo.url, primaryFilename)
              }
              disabled={isEmpty}
            >
              <Download className="size-3.5 mr-1.5" />
              Download
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg text-muted-foreground"
              disabled={isEmpty}
            >
              <MoreVertical className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>

      {/* Additional files */}
      {imageAssets.length > 0 && (
        <div className="mt-6 pt-5 border-t border-border/60">
          <h4 className="text-sm font-bold text-foreground mb-3">
            Additional Files
          </h4>
          <div className="divide-y divide-border/40">
            {imageAssets.map((asset) => (
              <AdditionalFileRow key={asset.key} asset={asset} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
