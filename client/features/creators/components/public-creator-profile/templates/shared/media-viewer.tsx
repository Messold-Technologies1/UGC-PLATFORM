"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicProfileMedia } from "../types";

type MediaViewerProps = {
  media: PublicProfileMedia[];
  /** Index of the open item, or null when closed. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onBook: () => void;
  bookLabel: string;
  /** Tailwind classes for the primary CTA, so templates keep their own accent. */
  ctaClassName?: string;
};

/**
 * Fullscreen reel viewer shared by every public-page template.
 *
 * The designs draw this as a 9:16 card with progress dots, arrow navigation and
 * a booking CTA. Templates restyle the CTA but the behaviour — keyboard
 * navigation, wrap-around paging, autoplay of the active reel — is identical,
 * so it lives here once.
 */
export function MediaViewer({
  media,
  index,
  onIndexChange,
  onClose,
  onBook,
  bookLabel,
  ctaClassName,
}: MediaViewerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isOpen = index !== null && media.length > 0;
  const safeIndex = index ?? 0;
  const current = media[safeIndex] ?? media[0] ?? null;

  const go = useCallback(
    (delta: number) => {
      if (media.length === 0) return;
      onIndexChange((safeIndex + delta + media.length) % media.length);
    },
    [media.length, onIndexChange, safeIndex],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    // Prevent the page behind the overlay from scrolling.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, isOpen, onClose]);

  // Restart playback whenever the active reel changes.
  useEffect(() => {
    if (!isOpen) return;
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => {
      // Autoplay can be refused (e.g. low-power mode); controls remain usable.
    });
  }, [current?.id, isOpen]);

  if (!isOpen || !current) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-[#0c0c0e]/95 p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Creator reel"
      onClick={onClose}
    >
      <div
        className="relative aspect-[9/16] h-[min(calc(100vh-60px),820px)] max-w-full overflow-hidden rounded-gc-lg bg-neutral-900"
        onClick={(event) => event.stopPropagation()}
      >
        <video
          ref={videoRef}
          src={current.videoUrl}
          poster={current.thumbnailUrl ?? undefined}
          className="size-full object-cover"
          playsInline
          controls
          preload="metadata"
        />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex gap-1">
          {media.map((item, itemIndex) => (
            <span
              key={item.id}
              className={cn(
                "h-[3px] flex-1 rounded-sm",
                itemIndex <= safeIndex ? "bg-white" : "bg-white/35",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onBook();
          }}
          className={cn(
            "absolute inset-x-3 bottom-3 flex h-14 items-center justify-center rounded-full bg-white px-6 text-base font-semibold text-gc-ink transition hover:bg-white/90",
            ctaClassName,
          )}
        >
          {bookLabel}
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
      >
        <X className="size-5" />
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              go(-1);
            }}
            aria-label="Previous reel"
            className="absolute left-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              go(1);
            }}
            aria-label="Next reel"
            className="absolute right-4 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}
    </div>
  );
}
