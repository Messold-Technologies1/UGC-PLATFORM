"use client";

import { ExternalLink, FileVideo, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";
import type { OrderDeliveryAsset } from "../../api/get-brand-order-deliveries";
import type { CreatorDeliveryItem } from "../../api/get-creator-deliveries";
import { useGetCreatorOrderDeliveriesQuery } from "../../hooks/use-get-creator-deliveries-query";

interface CreatorDeliveryAssetsCardProps {
  orderId: string;
  title: string;
  emptyLabel: string;
  action?: React.ReactNode;
  hideEmptyState?: boolean;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function filenameFromKey(key: string): string {
  const segments = key.split("/");
  return segments.at(-1) || key;
}

function shortFilename(filename: string, maxLength = 24): string {
  if (filename.length <= maxLength) return filename;
  const extIndex = filename.lastIndexOf(".");
  if (extIndex === -1) return `${filename.slice(0, maxLength - 3)}...`;
  const ext = filename.slice(extIndex);
  const name = filename.slice(0, extIndex);
  const keepLength = Math.max(6, maxLength - ext.length - 3);
  return `${name.slice(0, keepLength)}...${ext}`;
}

function revisionLabel(revisionNumber?: number): string {
  if (!revisionNumber) return "Initial delivery";
  return `Revision ${revisionNumber}`;
}

function toCarouselAssets(assets: OrderDeliveryAsset[]): CarouselAsset[] {
  return assets.map((asset) => ({
    id: asset.key,
    type: asset.kind,
    full: asset.url,
    thumb: asset.url,
  }));
}

function AssetButton({
  asset,
  index,
}: {
  asset: OrderDeliveryAsset;
  index: number;
}) {
  const filename = filenameFromKey(asset.key);
  const Icon = asset.kind === "video" ? FileVideo : ImageIcon;

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-8 max-w-full justify-start rounded-lg border-border/50 px-2.5 text-xs font-semibold"
    >
      <a href={asset.url} target="_blank" rel="noreferrer" title={filename}>
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">
          {asset.kind === "video" ? "Video" : "Image"} {index + 1}:{" "}
          {shortFilename(filename)}
        </span>
        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
      </a>
    </Button>
  );
}

/** One submitted revision: its video(s), label, date, note and download links. */
function DeliveryBlock({ delivery }: { delivery: CreatorDeliveryItem }) {
  const assets = delivery.assets ?? [];
  const submittedDate = formatDateTime(delivery.createdAt);
  if (assets.length === 0) return null;

  return (
    <div className="space-y-3">
      <ThumbnailsCarousel
        assets={toCarouselAssets(assets)}
        itemGroupClassName="aspect-auto h-36 rounded-lg"
      />

      <div>
        <p className="text-sm font-semibold text-foreground">
          {revisionLabel(delivery.revisionNumber)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {assets.length} file{assets.length === 1 ? "" : "s"}
          {submittedDate && ` • Submitted on ${submittedDate}`}
        </p>
      </div>

      {delivery.note ? (
        <p className="rounded-lg bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          {delivery.note}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {assets.map((asset, index) => (
          <AssetButton
            key={`${delivery.id}-${asset.key}`}
            asset={asset}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export function CreatorDeliveryAssetsCard({
  orderId,
  title,
  emptyLabel,
  action,
  hideEmptyState,
}: CreatorDeliveryAssetsCardProps) {
  const { data, isLoading } = useGetCreatorOrderDeliveriesQuery(orderId, {
    enabled: Boolean(orderId),
  });

  // Every submitted revision, newest first (current on top, history below).
  const deliveries = [...(data?.items ?? [])]
    .filter((d) => (d.assets ?? []).length > 0)
    .reverse();

  if (isLoading) {
    return (
      <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
        <h3 className="font-bold text-sm mb-4">{title}</h3>
        <Skeleton className="h-36 w-full rounded-lg" />
        {action}
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg border border-border/40 p-5 shadow-sm h-full flex flex-col">
      <h3 className="font-bold text-sm mb-4">{title}</h3>

      {deliveries.length > 0 ? (
        <div className="space-y-5">
          {deliveries.map((delivery, index) => (
            <div
              key={delivery.id}
              className={
                index > 0 ? "border-t border-border/40 pt-5" : undefined
              }
            >
              <DeliveryBlock delivery={delivery} />
            </div>
          ))}
        </div>
      ) : !hideEmptyState ? (
        <div className="flex flex-col items-center justify-center py-8 text-center flex-1">
          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center mb-3">
            <FileVideo className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : null}

      {action}
    </div>
  );
}
