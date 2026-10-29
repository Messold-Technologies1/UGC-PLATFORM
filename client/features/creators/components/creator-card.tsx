"use client";

import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Play,
  MapPin,
  ArrowRight,
  Gift,
  Volume2,
  VolumeX,
  Truck,
  Heart,
  Camera,
} from "lucide-react";
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
  /**
   * Show the creator's name in the footer, in the slot a brand's wishlist
   * button occupies. Off for brands, who are only ever given the opaque public
   * slug in `creator.name`; the admin browse-order board turns it on so its
   * cards can be told apart.
   */
  showName?: boolean;
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
  showName = false,
}: CreatorCardProps) {
  const [g1, g2] = posterColor(index);
  // The creator ranks their own niches, so the list arrives primary-first and
  // simply reads left to right — one primary, then two secondaries, none of
  // them marked out. `tags` is the fallback for records that predate the
  // ranked facets.
  const niches = (
    creator.categories?.length ? creator.categories : creator.tags
  ).slice(0, 3);
  const initials = getInitials(creator.name);
  const locationLabel = creator.location || "Location not set";
  const priceLabel = `₹${creator.startingPrice.toLocaleString("en-IN")}`;
  const isAvailable = creator.available !== false;
  // Earned, not guaranteed: a creator nobody has saved yet shows nothing
  // rather than a zero.
  const savedCount = creator.savedCount ?? 0;
  const showSaved = savedCount > 0;
  // Only creators a brand can actually buy travel from say so. The rest stay
  // quiet rather than carrying a "no" on every card.
  const showOnLocation = creator.onLocationShoot === true;
  // At most three: a fourth wraps the row for a name few briefs need.
  const languages = creator.languages.slice(0, 3);

  const profileImage = isHttpUrl(creator.thumbnail) ? creator.thumbnail : "";
  const videoThumbnail = isHttpUrl(creator.previewVideoThumbnail)
    ? creator.previewVideoThumbnail
    : "";
  const stillImageSrc = videoThumbnail || profileImage;

  const hasVideo =
    typeof creator.previewVideoUrl === "string" &&
    (creator.previewVideoUrl.startsWith("http://") ||
      creator.previewVideoUrl.startsWith("https://"));

  // Runtime fallback: if the server preview fails to load (e.g. the rendition
  // is missing / returns 403, or hasn't been generated yet), swap to the raw
  // intro video so the card still plays instead of dying on its poster.
  const introFallbackUrl = isHttpUrl(creator.introVideoUrl)
    ? creator.introVideoUrl
    : null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageSrc, setImageSrc] = useState(stillImageSrc);
  // `srcAttached` latches true on the first hover and stays true: it both
  // mounts the <video> and keeps it mounted, so the loaded media (and its
  // buffer) is retained across hovers — a second hover replays instantly
  // instead of re-fetching from the CDN. `playing` drives the poster/video
  // crossfade per hover.
  const [srcAttached, setSrcAttached] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Previews autoplay muted on hover — browsers block unmuted autoplay without a
  // user gesture. The rendition carries an audio track, so clicking the speaker
  // toggle (a gesture) unmutes it. Starts muted and resets to muted per card.
  const [muted, setMuted] = useState(true);
  // Flips true once the preview source errors, switching the <video> to the
  // intro fallback. Reset per card.
  const [usePreviewFallback, setUsePreviewFallback] = useState(false);
  const activeVideoUrl =
    usePreviewFallback && introFallbackUrl
      ? introFallbackUrl
      : creator.previewVideoUrl;
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
    setMuted(true);
    setUsePreviewFallback(false);
    clearHoverTimer();
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [creator.id, stillImageSrc, clearHoverTimer]);

  // Clean up a pending hover-intent timer on unmount.
  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const queryClient = useQueryClient();

  const handleMouseEnter = useCallback(() => {
    // Everything here waits out the hover-intent window, the profile prefetch
    // included. It used to fire on the bare mouseenter, so a pointer crossing
    // the grid queued one profile request per card it passed over — twenty-odd
    // requests the viewer never asked for, competing with the images that were
    // still loading.
    clearHoverTimer();
    hoverTimerRef.current = window.setTimeout(() => {
      hoverTimerRef.current = null;

      // Warm the profile-drawer data so the Overview tab is (usually) already
      // cached by the time the card is clicked, instead of starting the fetch
      // on open. `prefetchQuery` is a no-op when the data is still fresh.
      void queryClient.prefetchQuery({
        queryKey: creatorProfileQueryKey(creator.id),
        queryFn: () => getCreatorProfileClient(creator.id),
        staleTime: 2 * 60_000,
      });

      if (!hasVideo) return;
      // The <video> is only mounted from here on, so we cannot call play()
      // synchronously; the effect below starts it once the element exists.
      setSrcAttached(true);
      setPlaying(true);
    }, HOVER_INTENT_MS);
  }, [hasVideo, queryClient, creator.id, clearHoverTimer]);

  // Start playback on the render after `playing` flips true, i.e. once the
  // lazily-attached source exists.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    void video.play().catch(() => {});
  }, [playing]);

  // The source is attached lazily, so the effect above can call play() before
  // enough frame data has buffered — that play() can reject/stall, leaving the
  // card on its poster (the reason hover didn't reliably start the video).
  // Retry once the media signals it can play, as long as the pointer is still
  // on the card.
  const handleCanPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    void video.play().catch(() => {});
  }, [playing]);

  const handleMouseLeave = useCallback(() => {
    // Cancel a hover-intent that never matured into playback.
    clearHoverTimer();
    if (!hasVideo || !videoRef.current) return;
    // Pause but keep the source attached: the browser retains what it buffered,
    // so the next hover resumes instantly instead of re-fetching from the CDN.
    // (Resetting currentTime just rewinds the retained buffer to the start.)
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setPlaying(false);
  }, [hasVideo, clearHoverTimer]);

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

  // Preview source failed to load — fall back to the raw intro once (if we have
  // one that differs from the preview URL). Keeps the card playable through a
  // missing/403 rendition instead of leaving it stuck on the poster.
  const handleVideoError = useCallback(() => {
    if (
      !usePreviewFallback &&
      introFallbackUrl &&
      introFallbackUrl !== creator.previewVideoUrl
    ) {
      setUsePreviewFallback(true);
    }
  }, [usePreviewFallback, introFallbackUrl, creator.previewVideoUrl]);

  // Toggle sound on the hovering preview. The click is the user gesture browsers
  // require to allow unmuted playback; stop propagation so the card doesn't
  // navigate to the profile.
  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted((prev) => {
      const next = !prev;
      const video = videoRef.current;
      if (video) {
        video.muted = next;
        if (!next) void video.play().catch(() => {});
      }
      return next;
    });
  }, []);

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
      {/* The height lives here rather than on <article>: it is derived from the
          card's own width (100cqw), and an element cannot query itself. See
          .rbody in browse-creators.css. */}
      <div className="rbody">
        <div
          className={cn("reel", creator.firstOrderFreeEligible && "has-fof")}
        >
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

          {/* Mounted on the first hover, not on render. A <video> carrying a
              `poster` downloads that poster the moment it exists, even with no
              src attached — so every card in the grid was pulling its still
              twice over, once for the <Image> the viewer can see and once for
              a hidden video they may never hover. Mounting it late also keeps
              N video elements out of the document while scrolling. */}
          {hasVideo && srcAttached ? (
            <video
              ref={videoRef}
              // Once attached on first hover, the src stays put so the buffer is
              // retained for instant replay on later hovers.
              src={activeVideoUrl!}
              poster={videoThumbnail || profileImage || undefined}
              className={cn("real-media", !playing && "opacity-0")}
              muted={muted}
              loop
              playsInline
              // metadata (not none): once the src is attached the browser fetches
              // the moov/first frame, so playback can begin promptly on hover.
              preload="metadata"
              onCanPlay={handleCanPlay}
              onLoadedData={handleCanPlay}
              onError={handleVideoError}
            />
          ) : null}

          {hasVideo && playing ? (
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={muted ? "Unmute preview" : "Mute preview"}
              className="absolute bottom-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          ) : null}

          <div className="scrim" />

          <div className="scrubline">
            <i />
          </div>
          <div className="top">
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
            {/* The city alone — languages have a row of their own below, so
                this no longer has two fields fighting over one line. */}
            <div className="lc">
              <span className="lc-item" title={locationLabel}>
                <MapPin size={11} />
                <span className="lc-text">{locationLabel}</span>
              </span>
            </div>
          </div>
          {creator.firstOrderFreeEligible ? (
            <div className="fof-ribbon">
              <span>
                <Gift size={14} /> First order free
              </span>
            </div>
          ) : null}
        </div>

        <div className="foot">
          <div className="ftags">
            {niches.map((niche) => {
              const [bg, fg] = tagColor(niche);
              return (
                <span
                  key={niche}
                  className="ftag"
                  style={{ background: bg, color: fg }}
                >
                  {niche}
                </span>
              );
            })}
          </div>

          {/* What the creator will do for you. The travel column shows only
              for creators a brand can actually buy travel from — the add-on
              priced above zero — and the delivery promise, which every
              creator has, takes the whole row on its own when it does not. */}
          <div className="finfo">
            {showOnLocation ? (
              <div className="finfo-cell finfo-cell-go">
                <Camera size={15} />
                <div className="finfo-text">
                  {/* "shoot" and "delivery" drop on a narrow card so the two
                        boxes still sit side by side rather than stacking —
                        the words they leave behind carry the meaning. */}
                  <span className="finfo-label">
                    On-location<span className="finfo-long"> shoot</span>
                  </span>
                  <b className="finfo-value">Available</b>
                </div>
              </div>
            ) : null}

            <div className="finfo-cell">
              <Truck size={15} />
              <div className="finfo-text">
                <span className="finfo-label">Guaranteed</span>
                <b className="finfo-value">
                  <span className="finfo-long">
                    {creator.deliveryDays}-day delivery
                  </span>
                  <span className="finfo-brief">
                    {creator.deliveryDays} days
                  </span>
                </b>
              </div>
            </div>
          </div>

          {/* Who they can brief, and how many buyers have kept them. Both are
              conditional, and the row goes entirely when neither is there. */}
          {languages.length || showSaved ? (
            <div className="fmeta">
              {languages.length ? (
                <div className="fmeta-langs">
                  <span className="fmeta-value">
                    {languages.map((language, index) => (
                      <span key={language}>
                        {index > 0 ? <i className="fmeta-dot" /> : null}
                        {language}
                      </span>
                    ))}
                  </span>
                </div>
              ) : null}

              {languages.length && showSaved ? (
                <i className="finfo-rule" />
              ) : null}

              {showSaved ? (
                <div className="fmeta-saved">
                  <span className="fmeta-saved-count">
                    <Heart size={15} />
                    <b>{savedCount.toLocaleString("en-IN")}</b>
                  </span>
                  <span className="fmeta-label">
                    {savedCount === 1 ? "time saved" : "times saved"}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="fbottom">
            <div className="factions">
              {showName ? (
                <span
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] font-bold text-foreground"
                  title={creator.name}
                >
                  {creator.name}
                </span>
              ) : null}
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
                View profile <ArrowRight size={14} />
              </button>
            </div>
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
        {/* Mirrors the card's own rows so the grid doesn't reflow when the
            real cards land: 9/16 media, two chip rows, delivery, stats,
            actions. */}
        <Skeleton className="aspect-9/16 w-full rounded-none" />
        <div className="flex flex-1 flex-col gap-2 p-[11px_13px_12px]">
          <div className="flex h-[47px] flex-wrap content-start gap-[5px]">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-14 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-[34px] w-full rounded-[9px]" />
          <div className="flex h-10 items-center gap-3">
            <Skeleton className="h-6 flex-1 rounded-md" />
            <Skeleton className="h-6 flex-1 rounded-md" />
          </div>
          <div className="mt-auto flex items-center gap-2">
            <Skeleton className="h-9 flex-1 rounded-[9px]" />
            <Skeleton className="h-9 w-[72px] rounded-[9px]" />
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
