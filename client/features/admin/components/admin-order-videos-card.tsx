"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { useAdminOrderDeliveriesQuery } from "../api/get-admin-order-deliveries";
import type { OrderDeliveryItem } from "@/features/orders/api/get-brand-order-deliveries";

interface ReelItem {
  key: string;
  url: string;
  kind: "video" | "image";
  label: string;
  approved: boolean;
}

function deliveryLabel(item: OrderDeliveryItem, isLatest: boolean): string {
  if (item.revisionsUsed <= 0) {
    return isLatest ? "Delivery" : "Initial delivery";
  }
  return `Revision ${item.revisionsUsed}`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ReelCard({ item }: { item: ReelItem }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <div className="relative aspect-[9/16] w-[200px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-black sm:w-[220px]">
      {item.kind === "video" ? (
        <video
          ref={videoRef}
          // Load just the first frame so the card shows a still, not a blank
          // box; playback starts on click.
          src={`${item.url}#t=0.1`}
          className="size-full object-cover"
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) =>
            setDuration((e.currentTarget.duration as number) || null)
          }
        />
      ) : (
        <Image
          src={item.url}
          alt={item.label}
          fill
          sizes="220px"
          className="object-cover"
          unoptimized
        />
      )}

      {item.kind === "video" ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause video" : "Play video"}
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center transition",
            playing ? "bg-transparent hover:bg-black/10" : "bg-black/20",
          )}
        >
          {!playing ? (
            <span className="flex size-12 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-lg">
              <Play className="size-5 fill-neutral-900" strokeWidth={0} />
            </span>
          ) : null}
        </button>
      ) : null}

      {/* Duration badge (top-left) */}
      {item.kind === "video" && duration != null ? (
        <span className="pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
          <Play className="size-2.5 fill-white" strokeWidth={0} />
          {formatDuration(duration)}
        </span>
      ) : null}

      {/* Approved badge (top-right) */}
      {item.approved ? (
        <span className="absolute right-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          <CheckCircle2 className="size-3" />
          Approved
        </span>
      ) : null}

      {/* Delivery label (bottom) */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6 text-[11px] font-semibold text-white">
        {item.label}
      </span>
    </div>
  );
}

/**
 * Admin-only reel gallery of every video/asset delivered for an order (initial
 * + revisions), shown as a horizontal carousel of portrait cards. Videos from
 * the accepted delivery (the latest one, once `acceptedAt` is set) carry an
 * "Approved" badge.
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

  const reels = useMemo<ReelItem[]>(() => {
    const items = [...(data?.items ?? [])].reverse(); // newest first
    const latestId = items[0]?.id;
    const approvedOrder = Boolean(acceptedAt);
    return items.flatMap((delivery) => {
      const isLatest = delivery.id === latestId;
      const label = deliveryLabel(delivery, isLatest);
      const approved = isLatest && approvedOrder;
      return delivery.assets
        .filter((a) => a.url && (a.kind === "video" || a.kind === "image"))
        .map((a) => ({
          key: a.key,
          url: a.url,
          kind: a.kind,
          label,
          approved,
        }));
    });
  }, [data, acceptedAt]);

  const scrollByOne = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const amount = firstCard ? firstCard.offsetWidth + 16 : el.clientWidth * 0.9;
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <Film className="size-5 text-primary" />
        <h2 className="font-headline text-xl font-bold">Order Videos</h2>
        {data ? (
          <span className="text-sm text-muted-foreground">({reels.length})</span>
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
      ) : reels.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No videos have been delivered for this order yet.
        </p>
      ) : (
        <div className="relative">
          <div
            ref={scrollerRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]"
          >
            {reels.map((reel) => (
              <ReelCard key={reel.key} item={reel} />
            ))}
          </div>

          {reels.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scrollByOne(-1)}
                className="absolute left-1 top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md transition hover:bg-background"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scrollByOne(1)}
                className="absolute right-1 top-1/2 z-30 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-md transition hover:bg-background"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
