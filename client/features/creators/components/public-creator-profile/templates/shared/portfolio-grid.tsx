"use client";

import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicProfileMedia } from "../types";

type PortfolioGridProps = {
  items: PublicProfileMedia[];
  /** Index into the full media list, so the viewer opens on the right reel. */
  onOpen: (mediaIndex: number) => void;
  allMedia: PublicProfileMedia[];
  className?: string;
  tileClassName?: string;
};

/**
 * Portfolio tile grid.
 *
 * Every design draws 9:16 tiles with a centred play affordance; only the radius
 * and column sizing differ, which templates pass in. No duration badge: the API
 * carries no duration for portfolio videos.
 */
export function PortfolioGrid({
  items,
  onOpen,
  allMedia,
  className,
  tileClassName,
}: PortfolioGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))]",
        className,
      )}
    >
      {items.map((item) => {
        const position = allMedia.findIndex((entry) => entry.id === item.id);
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onOpen(Math.max(position, 0))}
            className={cn(
              "group relative aspect-[9/16] overflow-hidden rounded-gc-sm bg-gc-surface-alt",
              tileClassName,
            )}
          >
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote S3 thumbnail
              <img
                src={item.thumbnailUrl}
                alt=""
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <video
                src={item.videoUrl}
                className="absolute inset-0 size-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            )}
            <span className="absolute left-1/2 top-1/2 flex size-13 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
              <Play className="size-4 fill-gc-ink text-gc-ink" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
