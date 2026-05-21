"use client";

import {
  Download,
  ExternalLink,
  FileVideo,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBrandOrderDeliveriesQuery } from "../../../hooks/use-get-brand-order-deliveries-query";
import type { OrderDeliveryAsset } from "../../../api/get-brand-order-deliveries";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import type { OrderDetailsPublic } from "../../../api/types";

interface FinalDeliveredVideoCardProps {
  orderId: string;
  order: OrderDetailsPublic;
}

function filenameFromKey(key: string): string {
  const segments = key.split("/");
  return segments[segments.length - 1] ?? key;
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  return `${d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}, ${d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })}`;
}

function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

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

function AdditionalFileCard({ asset }: { asset: OrderDeliveryAsset }) {
  const filename = filenameFromKey(asset.key);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border bg-background/50 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <ImageIcon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {filename}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 pl-4">
        <span className="text-xs font-medium text-muted-foreground tabular-nums">
          2.4 MB
        </span>
        <button
          type="button"
          onClick={() => downloadAsset(asset.url, filename)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted/80"
          aria-label={`Download ${filename}`}
        >
          <Download className="size-4" />
        </button>
      </div>
    </div>
  );
}

function FinalDeliveredVideoSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="flex flex-col sm:flex-row gap-6">
        <Skeleton className="aspect-video w-full sm:w-[280px] rounded-xl" />
        <div className="flex-1 space-y-4 pt-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-52" />
          <div className="flex gap-3 pt-3">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-12 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinalDeliveredVideoCard({
  orderId,
  order,
}: FinalDeliveredVideoCardProps) {
  const { data, isLoading, isError } = useGetBrandOrderDeliveriesQuery(orderId);

  if (isLoading) {
    return <FinalDeliveredVideoSkeleton />;
  }

  const deliveries = data?.items ?? [];
  const latestDelivery = deliveries.at(-1);
  const allAssets = latestDelivery?.assets ?? [];
  const videoAssets = allAssets.filter((a) => a.kind === "video");
  const imageAssets = allAssets.filter((a) => a.kind === "image");
  const primaryVideo = videoAssets[0];

  const carouselAssets: CarouselAsset[] = allAssets.map((asset) => ({
    id: asset.key,
    type: asset.kind,
    full: asset.url,
    thumb: asset.url,
  }));

  if (isError) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm h-full">
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

  const deliveredDateStr = isEmpty
    ? "Not delivered yet"
    : formatDateTime(latestDelivery?.createdAt);
  const approvedDateStr = order.acceptedAt
    ? formatDateTime(order.acceptedAt)
    : "Pending Approval";

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm flex flex-col h-full">
      <h3 className="text-base font-bold text-foreground mb-6">
        Final Delivered Video
      </h3>

      <div className="flex flex-col sm:flex-row gap-6">
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

        <div className="flex-1 min-w-0 flex flex-col py-1">
          <div>
            <h4
              className={`text-base font-bold truncate ${isEmpty ? "text-muted-foreground/60" : "text-foreground"}`}
            >
              {primaryFilename}
            </h4>

            <div className="space-y-1.5 mt-3 text-sm">
              <p className="text-muted-foreground font-medium">
                {isEmpty ? "-- • -- • --" : "1080p • 60 sec • 86.4 MB"}
              </p>
              <p className="text-muted-foreground">
                Delivered on{" "}
                <span className="font-medium text-foreground">
                  {deliveredDateStr}
                </span>
              </p>
              <p className="text-emerald-600 dark:text-emerald-500 font-semibold">
                Approved on {approvedDateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-auto pt-6">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg font-semibold text-xs px-4 h-9"
              onClick={() =>
                primaryVideo && downloadAsset(primaryVideo.url, primaryFilename)
              }
              disabled={isEmpty}
            >
              <Download className="size-3.5 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 rounded-lg text-muted-foreground h-9 w-9"
              onClick={() => primaryVideo && openInNewTab(primaryVideo.url)}
              disabled={isEmpty}
            >
              <ExternalLink className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {imageAssets.length > 0 && (
        <div className="mt-8 pt-6 border-t border-border/60">
          <h4 className="text-sm font-bold text-foreground mb-4">
            Additional Files
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {imageAssets.map((asset) => (
              <AdditionalFileCard key={asset.key} asset={asset} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
