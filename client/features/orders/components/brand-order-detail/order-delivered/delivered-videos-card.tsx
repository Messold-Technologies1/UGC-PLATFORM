"use client";

import {
  ChevronDown,
  Download,
  Eye,
  FileVideo,
  Image as ImageIcon,
  MessageCircle,
  MessageSquareQuote,
  MoreVertical,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBrandOrderDeliveriesQuery } from "../../../hooks/use-get-brand-order-deliveries-query";
import type {
  OrderDeliveryAsset,
  OrderDeliveryItem,
} from "../../../api/get-brand-order-deliveries";
import {
  ThumbnailsCarousel,
  type CarouselAsset,
} from "@/components/ui/thumbnails-carousel";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { OrderDetailsPublic } from "../../../api/types";
import {
  DeliveryPreviewPreparing,
  getLatestDeliveryPreviewState,
} from "./delivery-preview-preparing";

interface DeliveredVideosCardProps {
  orderId: string;
  order?: OrderDetailsPublic;
  creatorName?: string;
  variant?: "delivered" | "completed";
  sidebar?: ReactNode;
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

function revisionLabel(revisionNumber?: number): string {
  if (!revisionNumber) return "Initial delivery";
  return `Revision ${revisionNumber}`;
}

function DeliveryNoteBlock({
  title,
  body,
  emptyText,
}: Readonly<{ title: string; body?: string | null; emptyText: string }>) {
  const text = body?.trim();

  return (
    <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
      <div className="flex items-center gap-1.5">
        <MessageSquareQuote className="size-3.5 shrink-0 text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
          {title}
        </p>
      </div>
      <p
        className={
          text
            ? "mt-1.5 max-h-28 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground"
            : "mt-1.5 text-xs italic leading-relaxed text-muted-foreground/70"
        }
      >
        {text || emptyText}
      </p>
    </div>
  );
}

function PreviousVersionsAccordion({
  versions,
}: Readonly<{ versions: OrderDeliveryItem[] }>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <h4 className="text-sm font-bold text-foreground">
          Previous versions ({versions.length})
        </h4>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <ChevronDown
            className={`size-4 pointer-events-none transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>
      {open ? (
        <div className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {versions.map((delivery) => (
            <PreviousVersionBlock key={delivery.id} delivery={delivery} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A superseded delivery shown under "Previous versions". */
function PreviousVersionBlock({
  delivery,
}: {
  delivery: OrderDeliveryItem;
}) {
  const assets = delivery.assets ?? [];
  if (assets.length === 0) return null;
  const carouselAssets: CarouselAsset[] = assets.map((asset) => ({
    id: asset.key,
    type: asset.kind,
    full: asset.url,
    thumb: asset.url,
  }));

  return (
    <div className="flex w-[200px] shrink-0 snap-start flex-col gap-3 rounded-xl border border-border/50 p-3">
      <div className="w-full">
        <ThumbnailsCarousel
          assets={carouselAssets}
          itemGroupClassName="aspect-auto h-[180px] rounded-lg"
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {revisionLabel(delivery.revisionsUsed)}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatDeliveryDate(delivery.createdAt)}
        </p>
        {delivery.note?.trim() ? (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap rounded-lg bg-muted/30 p-2 text-xs leading-relaxed text-muted-foreground">
            {delivery.note.trim()}
          </p>
        ) : null}
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
        <Skeleton className="h-[280px] w-[340px] rounded-xl" />
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

export function DeliveredVideosCard({
  orderId,
  order,
  creatorName = "Creator",
  variant = "delivered",
  sidebar,
}: DeliveredVideosCardProps) {
  const { data, isLoading, isError } = useGetBrandOrderDeliveriesQuery(orderId);

  if (isLoading) {
    return <DeliveredVideosSkeleton />;
  }

  const deliveries = data?.items ?? [];
  const {
    latestDelivery,
    previewGenerating,
    isRevision,
    playableAssets,
  } = getLatestDeliveryPreviewState(deliveries);
  // Every superseded delivery, newest first (below the current one).
  const previousVersions = deliveries
    .filter(
      (d) => d.id !== latestDelivery?.id && (d.assets ?? []).length > 0,
    )
    .reverse();
  const allAssets = latestDelivery?.assets ?? [];
  const videoAssets = allAssets.filter((a) => a.kind === "video");
  const imageAssets = allAssets.filter((a) => a.kind === "image");
  const videoCount = videoAssets.length;

  const isWatermarked = allAssets.some((a) => a.watermarked);

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

  const isCompleted = variant === "completed";

  if (previewGenerating && !isCompleted) {
    return (
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 justify-between">
          <div className="flex-1 min-w-0 w-full">
            <DeliveryPreviewPreparing
              creatorName={creatorName}
              isRevision={isRevision}
            />
          </div>

          <div className="shrink-0 w-full md:w-[260px] xl:w-[280px] flex flex-col justify-center">
            <div className="space-y-1.5">
              <h4 className="text-sm font-bold text-foreground">
                {isRevision ? "Revision incoming" : "Preview incoming"}
              </h4>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {creatorName} has submitted{" "}
                {isRevision ? "updated content" : "new content"}. This page
                refreshes automatically — no need to reload.
              </p>
              {latestDelivery?.createdAt ? (
                <p className="text-xs text-muted-foreground pt-1">
                  {formatDeliveryDate(latestDelivery.createdAt)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const extras = (
    <>
      {imageAssets.length > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
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

      {previousVersions.length > 0 && (
        <PreviousVersionsAccordion versions={previousVersions} />
      )}
    </>
  );

  const currentDelivery = (
    <>
      {isCompleted && (
        <h3 className="text-base font-bold text-foreground mb-6">
          Final Delivery
        </h3>
      )}

      {isWatermarked && !isEmpty && !previewGenerating && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <Eye className="size-4 shrink-0 mt-0.5" />
          <span>
            You&apos;re viewing a <strong>watermarked preview</strong>. Accept
            the delivery to download the original, watermark-free files.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex w-full shrink-0 flex-col sm:w-[300px] lg:w-[340px] xl:w-[380px]">
          {isEmpty || carouselAssets.length === 0 ? (
            <div className="relative flex h-[280px] min-h-[280px] w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/50 text-muted-foreground/50 sm:h-auto xl:min-h-[320px]">
              <FileVideo className="size-8 mb-2" />
              <span className="text-xs font-medium">No media</span>
            </div>
          ) : (
            <ThumbnailsCarousel
              className="flex h-[280px] min-h-[280px] flex-1 flex-col sm:h-full xl:min-h-[320px]"
              assets={carouselAssets}
              itemGroupClassName="aspect-auto h-full min-h-[280px] max-h-none xl:min-h-[320px]"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-center gap-2">
              <FileVideo
                className={`size-4 shrink-0 ${isEmpty ? "text-muted-foreground/40" : "text-muted-foreground"}`}
              />
              <h4
                className={`text-sm font-bold truncate ${isEmpty ? "text-muted-foreground/60" : "text-foreground"}`}
              >
                {isEmpty ? "Pending Delivery..." : `${videoCount} Video${videoCount !== 1 ? "s" : ""} Delivered`}
              </h4>
            </div>
            <p className="pl-6 text-xs text-muted-foreground">
              {isEmpty
                ? "Not delivered yet"
                : formatDeliveryDate(latestDelivery?.createdAt)}
            </p>
            {isCompleted ? (
              <p className="pl-6 text-xs font-semibold text-emerald-600 dark:text-emerald-500">
                {formatApprovedDate(order?.acceptedAt)}
              </p>
            ) : null}
          </div>

          {!isCompleted ? (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="mt-3 h-9 w-full justify-center rounded-lg px-3 text-xs font-semibold lg:hidden"
            >
              <Link href={`/brand/messages?orderId=${orderId}`}>
                <MessageCircle className="mr-1.5 size-3.5" />
                Message Creator
              </Link>
            </Button>
          ) : null}

          {isRevision ? (
            <div className="mt-4 space-y-3">
              <DeliveryNoteBlock
                title="What you asked for"
                body={
                  order?.status === "REVISION_REQUESTED"
                    ? order.previousRevision?.note
                    : latestDelivery?.brandRevisionNote ??
                      order?.currentRevision?.note
                }
                emptyText="No revision notes were added"
              />
              <DeliveryNoteBlock
                title="Creator remarks"
                body={latestDelivery?.note}
                emptyText="No creator remarks"
              />
            </div>
          ) : (
            <div className="mt-4">
              <DeliveryNoteBlock
                title="Creator remarks"
                body={latestDelivery?.note}
                emptyText="No creator remarks"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (sidebar) {
    return (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
        <div className="w-full rounded-lg border bg-card p-5 shadow-sm lg:col-span-8">
          {currentDelivery}
          {extras}
        </div>
        <div className="w-full lg:col-span-4">{sidebar}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      {currentDelivery}
      {extras}
    </div>
  );
}
