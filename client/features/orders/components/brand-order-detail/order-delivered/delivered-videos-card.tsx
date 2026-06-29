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
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";

import type { OrderDetailsPublic } from "../../../api/types";
import { ExternalLink } from "lucide-react";

interface DeliveredVideosCardProps {
  orderId: string;
  order?: OrderDetailsPublic;
  variant?: "delivered" | "completed";
}

function filenameFromKey(key: string): string {
  const segments = key.split("/");
  return segments[segments.length - 1] ?? key;
}

function formatShortFilename(filename: string, maxLength: number = 24): string {
  if (filename.length <= maxLength) return filename;
  const extIndex = filename.lastIndexOf(".");
  if (extIndex === -1) return filename.slice(0, maxLength) + "...";
  const ext = filename.slice(extIndex);
  const name = filename.slice(0, extIndex);
  const keepLength = maxLength - ext.length - 3;
  if (keepLength <= 0) return filename.slice(0, maxLength) + "...";
  return name.slice(0, keepLength) + "..." + ext;
}

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

function formatApprovedDate(value?: string | null): string {
  if (!value) return "Pending Approval";
  const d = new Date(value);
  return `Approved on ${d.toLocaleDateString("en-IN", {
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
  const shortFilename = formatShortFilename(filename, 20);

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 shadow-sm w-full sm:w-[280px]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ImageIcon className="size-5" />
        </div>
        <span className="text-sm font-semibold text-foreground truncate" title={filename}>
          {shortFilename}
        </span>
      </div>
      <div className="flex items-center gap-3 pl-3 shrink-0">
        {/* Placeholder for size until added to API */}
        <span className="text-xs font-medium text-muted-foreground">1.8 MB</span>
        <button
          type="button"
          onClick={() => downloadAsset(asset.url, filename)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted"
          aria-label={`Download ${filename}`}
        >
          <Download className="size-4" />
        </button>
      </div>
    </div>
  );
}

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

export function DeliveredVideosCard({ orderId, order, variant = "delivered" }: DeliveredVideosCardProps) {
  const { data, isLoading, isError } = useGetBrandOrderDeliveriesQuery(orderId);

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

  // Pre-acceptance the brand sees watermarked previews. Some may still be
  // generating (no url yet) — surface that instead of rendering broken media.
  const isWatermarked = allAssets.some((a) => a.watermarked);
  const previewGenerating =
    allAssets.length > 0 &&
    allAssets.some((a) => a.watermarked && (!a.url || a.previewStatus === "pending"));
  const playableAssets = allAssets.filter((a) => !!a.url);

  const carouselAssets: CarouselAsset[] = playableAssets.map((asset) => ({
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
  const shortPrimaryFilename = primaryVideo 
    ? formatShortFilename(primaryFilename, 30) 
    : primaryFilename;

  const isCompleted = variant === "completed";

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm flex flex-col h-full">
      {isCompleted && (
        <h3 className="text-base font-bold text-foreground mb-6">
          Final Delivery
        </h3>
      )}

      {isWatermarked && !isEmpty && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <Eye className="size-4 shrink-0 mt-0.5" />
          <span>
            You&apos;re viewing a <strong>watermarked preview</strong>.
            {previewGenerating
              ? " Some files are still being prepared — check back in a moment."
              : " Accept the delivery to download the original, watermark-free files."}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="flex-1 min-w-0 w-full">
            {isEmpty || carouselAssets.length === 0 ? (
              <div className="relative aspect-auto h-[263px] xl:h-[295px] w-full rounded-xl overflow-hidden bg-muted/50 border border-border/50 flex flex-col items-center justify-center text-muted-foreground/50">
                <FileVideo className="size-8 mb-2" />
                <span className="text-xs font-medium">No media</span>
              </div>
            ) : (
              <ThumbnailsCarousel 
                assets={carouselAssets} 
                itemGroupClassName="aspect-auto h-[263px] xl:h-[295px]" 
              />
            )}
          </div>

          <div className="shrink-0 w-full md:w-[260px] xl:w-[280px] flex flex-col justify-center">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileVideo
                  className={`size-4 shrink-0 ${isEmpty ? "text-muted-foreground/40" : "text-muted-foreground"}`}
                />
                <h4
                  className={`text-sm font-bold truncate ${isEmpty ? "text-muted-foreground/60" : "text-foreground"}`}
                >
                  {isEmpty ? "Pending Delivery..." : `${videoCount} Video${videoCount !== 1 ? "s" : ""} Delivered`}
                </h4>
              </div>
              <div className="space-y-1.5 pt-1.5">
                <p className="text-xs text-muted-foreground">
                  {isEmpty
                    ? "Not delivered yet"
                    : formatDeliveryDate(latestDelivery?.createdAt)}
                </p>
                {isCompleted && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                    {formatApprovedDate(order?.acceptedAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-6">
              {isCompleted ? (
                <>
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
                    variant="outline"
                    size="icon"
                    className="size-9 rounded-lg text-muted-foreground h-9 w-9"
                    onClick={() => primaryVideo && openInNewTab(primaryVideo.url)}
                    disabled={isEmpty}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                </>
              ) : (
                <>
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
                      primaryVideo &&
                      downloadAsset(primaryVideo.url, primaryFilename)
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {imageAssets.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <h4 className="text-sm font-bold text-foreground mb-2">
            Additional Files
          </h4>
          <div className="flex flex-wrap gap-2">
            {imageAssets.map((asset) => (
              <AdditionalFileCard key={asset.key} asset={asset} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
