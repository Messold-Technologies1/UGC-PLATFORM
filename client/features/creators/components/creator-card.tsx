"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Play, MapPin, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Creator } from "../types";
import { getInitials, posterColor, tagColor, cn } from "@/lib/utils";
import { shouldSuppressCreatorCardNavigation } from "@/features/wishlists/lib/suppress-creator-card-navigation";
import { SaveToWishlistButton } from "@/features/wishlists/components/save-to-wishlist-button";
import { useQueryClient } from "@tanstack/react-query";
import { creatorProfileQueryKey } from "../hooks/use-creator-profile-query";
import { getCreatorProfileClient } from "../api/get-creator-profile-client";

export interface CreatorCardProps {
  creator: Creator;
  index: number;
  onOpen: (creator: Creator) => void;
  /**
   * Whether the current viewer is a brand/agency (drives the wishlist button).
   * Resolved once by the parent list so each card doesn't subscribe to the
   * auth query independently.
   */
  isBrand: boolean;
}

function isHttpUrl(url: string | null | undefined): url is string {
  return (
    typeof url === "string" &&
    (url.startsWith("http://") || url.startsWith("https://"))
  );
}

export const CreatorCard = memo(function CreatorCard({
  creator,
  index,
  onOpen,
  isBrand,
}: CreatorCardProps) {
  const [g1, g2] = posterColor(index);
  const tags = (
    creator.categories?.length ? creator.categories : creator.tags
  ).slice(0, 2);
  const initials = getInitials(creator.name);
  const locationLabel = creator.location || "Location not set";
  const priceLabel = `₹${creator.startingPrice.toLocaleString("en-IN")}`;
  const deliveryLabel = `Guaranteed ${creator.deliveryDays}-day delivery`;
  const isAvailable = creator.available !== false;

  const profileImage = isHttpUrl(creator.thumbnail) ? creator.thumbnail : "";
  const videoThumbnail = isHttpUrl(creator.previewVideoThumbnail)
    ? creator.previewVideoThumbnail
    : "";
  const stillImageSrc = videoThumbnail || profileImage;

  const hasVideo =
    typeof creator.previewVideoUrl === "string" &&
    (creator.previewVideoUrl.startsWith("http://") ||
      creator.previewVideoUrl.startsWith("https://"));

  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageSrc, setImageSrc] = useState(stillImageSrc);
  // `srcAttached` latches true on the first hover and stays true so the loaded
  // media (and its buffer) is retained across hovers — a second hover replays
  // instantly instead of re-fetching from the CDN. `playing` drives the
  // poster/video crossfade per hover.
  const [srcAttached, setSrcAttached] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  // Hover-intent timer: a mouse sweeping across the grid shouldn't kick off a
  // load+play (and a CDN connection) for every card it crosses.
  const hoverTimerRef = useRef<number | null>(null);
  const HOVER_INTENT_MS = 130;

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setImageSrc(stillImageSrc);
    setSrcAttached(false);
    setPlaying(false);
    setIsMuted(true);
    clearHoverTimer();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
    }
  }, [creator.id, stillImageSrc, clearHoverTimer]);

  // Clean up a pending hover-intent timer on unmount.
  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const queryClient = useQueryClient();

  const handleMouseEnter = useCallback(() => {
    // Warm the profile-drawer data so the Overview tab is (usually) already
    // cached by the time the card is clicked, instead of starting the fetch on
    // open. `prefetchQuery` is a no-op when the data is still fresh.
    void queryClient.prefetchQuery({
      queryKey: creatorProfileQueryKey(creator.id),
      queryFn: () => getCreatorProfileClient(creator.id),
      staleTime: 2 * 60_000,
    });

    if (!hasVideo) return;
    // Wait out a brief hover-intent window before attaching the source and
    // starting playback. Its src is attached lazily (see the <video> element),
    // so we can't call play() synchronously here; the effect below starts
    // playback once the source is actually attached.
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;
      setSrcAttached(true);
      setPlaying(true);
    }, HOVER_INTENT_MS);
  }, [hasVideo, queryClient, creator.id, clearHoverTimer]);

  // Start playback on the render after `playing` flips true, i.e. once the
  // lazily-attached source exists.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    video.muted = isMuted;
    void video.play().catch(() => {});
  }, [playing, isMuted]);

  // The source is attached lazily, so the effect above can call play() before
  // enough frame data has buffered — that play() can reject/stall, leaving the
  // card on its poster (the reason hover didn't reliably start the video).
  // Retry once the media signals it can play, as long as the pointer is still
  // on the card.
  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    video.muted = isMuted;
    void video.play().catch(() => {});
  }, [playing, isMuted]);

  const handleMouseLeave = useCallback(() => {
    // Cancel a hover-intent that never matured into playback.
    clearHoverTimer();
    if (!hasVideo || !videoRef.current) return;
    // Pause but keep the source attached: the browser retains what it buffered,
    // so the next hover resumes instantly instead of re-fetching from the CDN.
    // (Resetting currentTime just rewinds the retained buffer to the start.)
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    videoRef.current.muted = true;
    setPlaying(false);
    setIsMuted(true);
  }, [hasVideo, clearHoverTimer]);

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (!next) {
          void videoRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  const handleImageError = useCallback(() => {
    if (profileImage && imageSrc !== profileImage) {
      setImageSrc(profileImage);
      return;
    }
    setImageSrc("");
  }, [profileImage, imageSrc]);

  const handleArticleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (shouldSuppressCreatorCardNavigation()) return;

      const target = e.target as HTMLElement;
      if (target.closest("button, a, [data-save-wishlist]")) return;

      onOpen(creator);
    },
    [creator, onOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (shouldSuppressCreatorCardNavigation()) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen(creator);
      }
    },
    [creator, onOpen],
  );

  const handleViewClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onOpen(creator);
    },
    [creator, onOpen],
  );

  return (
    <article
      className="rcard"
      onClick={handleArticleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="button"
      tabIndex={0}
      aria-label={`View ${creator.name}'s profile`}
      onKeyDown={handleKeyDown}
    >
      <div className="reel">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${creator.name}'s content`}
            fill
            className={cn("real-media", hasVideo && playing && "opacity-0")}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 214px"
            onError={handleImageError}
          />
        ) : (
          <div
            className="ip"
            style={{
              background: `linear-gradient(155deg, ${g1}, ${g2})`,
            }}
          >
            <span className="mono">{initials}</span>
          </div>
        )}

        {hasVideo ? (
          <video
            ref={videoRef}
            // Once attached on first hover, the src stays put so the buffer is
            // retained for instant replay on later hovers.
            src={srcAttached ? creator.previewVideoUrl! : undefined}
            poster={videoThumbnail || profileImage || undefined}
            className={cn("real-media", !playing && "opacity-0")}
            muted={isMuted}
            loop
            playsInline
            // metadata (not none): once the src is attached the browser fetches
            // the moov/first frame, so playback can begin promptly on hover.
            preload="metadata"
            onCanPlay={handleCanPlay}
            onLoadedData={handleCanPlay}
          />
        ) : null}

        <div className="scrim" />

        <div className="scrubline">
          <i />
        </div>
        <div className="top">
          <span className="vchip">{deliveryLabel}</span>
          {isAvailable ? (
            <span className="availchip online">
              <i /> Online
            </span>
          ) : (
            <span className="availchip offline">
              <i /> Offline
            </span>
          )}
        </div>

        <div className="play">
          <div className="pb">
            <Play size={18} />
          </div>
        </div>

        <div className="who">
          <div className="nm">{priceLabel}</div>
          <div className="lc">
            <MapPin size={11} /> {locationLabel}
            <span style={{ opacity: 0.5 }}>·</span>
            {creator.languages.slice(0, 2).join(", ")}
          </div>
        </div>

        {hasVideo ? (
          <button
            type="button"
            onClick={handleToggleMute}
            className="absolute bottom-3 right-3 z-20 flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all hover:bg-black/60"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        ) : null}
      </div>

      <div className="foot">
        <div className="ftags">
          {tags.map((tag) => {
            const [bg, fg] = tagColor(tag);
            return (
              <span
                key={tag}
                className="ftag"
                style={{ background: bg, color: fg }}
              >
                {tag}
              </span>
            );
          })}
        </div>

        <div className="fbottom">
          <div className="factions">
            {isBrand ? (
              <SaveToWishlistButton
                creatorId={creator.id}
                creatorName={creator.name}
                creatorImageUrl={creator.thumbnail}
                creatorCategory={
                  creator.categories?.[0] || creator.category || null
                }
                creatorCity={
                  creator.location !== "Location not set"
                    ? creator.location
                    : null
                }
                variant="card"
              />
            ) : null}
            <button type="button" className="fview" onClick={handleViewClick}>
              View <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});

export function CreatorCardSkeleton({
  appearance = "standard",
}: {
  appearance?: "standard" | "browse";
}) {
  if (appearance === "browse") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <Skeleton className="aspect-4/5 w-full rounded-none" />
        <div className="flex flex-1 flex-col p-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
          <div className="mt-1 space-y-2">
            <Skeleton className="h-3 w-24 rounded-full" />
            <Skeleton className="h-3 w-36 rounded-full" />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="mt-auto flex items-center justify-between pt-3">
            <div className="space-y-1">
              <Skeleton className="h-2 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-4/5 w-full rounded-none rounded-t-2xl" />
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-8 w-22 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
