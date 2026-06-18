"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Play, Star, MapPin, CheckCircle, ArrowRight, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Creator } from "../types";
import {
  getInitials,
  posterColor,
  tagColor,
  formatReelDuration,
} from "@/lib/utils";
import { SaveToWishlistButton } from "@/features/wishlists/components/save-to-wishlist-button";
import { shouldSuppressCreatorCardNavigation } from "@/features/wishlists/lib/suppress-creator-card-navigation";
import { usePublicAuthUser } from "@/features/auth/hooks/use-me-query";

export interface CreatorCardProps {
  creator: Creator;
  index: number;
  onOpen: (creator: Creator) => void;
}

export const CreatorCard = memo(function CreatorCard({
  creator,
  index,
  onOpen,
}: CreatorCardProps) {
  const { data: meUser } = usePublicAuthUser();
  const isBrand =
    meUser?.roles?.includes("BRAND") || meUser?.roles?.includes("AGENCY");
  const [isMuted, setIsMuted] = useState(true);
  const [g1, g2] = posterColor(index);
  const tags = (creator.categories?.length ? creator.categories : creator.tags).slice(0, 2);
  const reelDuration = formatReelDuration(index);
  const initials = getInitials(creator.name);
  const verified = creator.rating >= 4.8;
  const locationLabel = creator.location || "Location not set";

  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo =
    typeof creator.previewVideoUrl === "string" &&
    (creator.previewVideoUrl.startsWith("http://") ||
      creator.previewVideoUrl.startsWith("https://"));
  const hasImage = Boolean(creator.thumbnail);

  const handleMouseEnter = useCallback(() => {
    if (hasVideo && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [hasVideo]);

  const handleMouseLeave = useCallback(() => {
    if (hasVideo && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [hasVideo]);

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

  const handleToggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted((prev) => !prev);
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
      <div className="reel">
        {hasVideo ? (
          <video
            ref={videoRef}
            src={creator.previewVideoUrl!}
            poster={creator.previewVideoThumbnail || creator.thumbnail}
            className="real-media"
            muted={isMuted}
            loop
            playsInline
            preload="metadata"
          />
        ) : hasImage ? (
          <Image
            src={creator.thumbnail}
            alt={`${creator.name}'s content`}
            fill
            className="real-media"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 214px"
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

        <div className="scrim" />

        <div className="scrubline">
          <i />
        </div>
        <div className="top">
          <span className="vchip">
            <Play size={10} /> {reelDuration}
          </span>
          <span className="vchip">
            <Star size={10} style={{ color: "#ffd24a" }} />{" "}
            {creator.rating.toFixed(1)}
          </span>
        </div>

        <div className="play">
          <div className="pb">
            <Play size={18} />
          </div>
        </div>

        <div className="who">
          <div className="nm">
            {creator.name}
            {verified ? <CheckCircle size={14} className="vf" /> : null}
          </div>
          <div className="lc">
            <MapPin size={11} /> {locationLabel}
            <span style={{ opacity: 0.5 }}>·</span>
            {creator.languages.slice(0, 2).join(", ")}
          </div>
        </div>

        {isBrand && (
          <SaveToWishlistButton
            creatorId={creator.id}
            creatorName={creator.name}
            creatorImageUrl={creator.thumbnail}
            variant="icon"
          />
        )}
        {hasVideo && (
          <button
            type="button"
            onClick={handleToggleMute}
            className="absolute bottom-3 right-3 z-20 flex size-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all hover:bg-black/60"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
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
          <div className="fprice">
            <b>₹{creator.startingPrice.toLocaleString("en-IN")}</b>
            <small>
              {creator.ordersCompleted} orders · {creator.deliveryDays}d
            </small>
          </div>
          <button type="button" className="fview" onClick={handleViewClick}>
            View <ArrowRight size={14} />
          </button>
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
