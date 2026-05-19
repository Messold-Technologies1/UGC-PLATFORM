"use client";

import { memo, useMemo, useRef, useState } from "react";
import {
  Play,
  Clock,
  Star,
  Users,
  Baby,
  PawPrint,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CreatorProfile } from "../types";

interface ProfileHeaderProps {
  creator: CreatorProfile;
}

function isRemoteImage(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export const ProfileHeader = memo(function ProfileHeader({
  creator,
}: ProfileHeaderProps) {
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const initials = useMemo(
    () =>
      creator.name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?",
    [creator.name],
  );
  const displayTags = creator.tags.slice(0, 5);

  const features = [
    `Delivery in ${creator.deliveryDays} days`,
    creator.basicEditing !== false ? "Basic editing included" : null,
    creator.storeVisit ? "On-location available" : null,
    creator.travelAvailable ? "Can travel for shoots" : null,
    "Fast response creator",
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
      <div className="relative w-full shrink-0 lg:w-[320px] xl:w-[340px]">
        <div 
          className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-black"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
          onTouchStart={() => setShowControls(true)}
        >
          {creator.introVideoUrl ? (
            <>
              <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm pointer-events-none">
                <Play className="size-2.5 fill-white" />
                Intro Video
              </div>

              <video
                ref={videoRef}
                className="size-full object-cover"
                src={creator.introVideoUrl}
                poster={
                  isRemoteImage(creator.thumbnail)
                    ? creator.thumbnail
                    : undefined
                }
                preload="metadata"
                playsInline
                controls={showControls}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />

              {!isPlaying && (
                <button
                  type="button"
                  onClick={togglePlay}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/20"
                  aria-label="Play video"
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-110">
                    <Play className="size-6 fill-black text-black ml-1" />
                  </div>
                </button>
              )}
            </>
          ) : (
            <span className="flex size-full items-center justify-center text-5xl font-bold text-white">
              {initials}
            </span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {creator.name}
        </h1>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <span>{creator.location}</span>
          {creator.languages.length > 0 && (
            <>
              <span>•</span>
              <span>{creator.languages.join(", ")}</span>
            </>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {displayTags.map((tag, i) => {
            const lowerTag = tag.toLowerCase();
            let specificClass = "";
            if (lowerTag.includes("beauty")) specificClass = "bg-[#fce7f3] text-[#be185d]";
            else if (lowerTag.includes("casual") || lowerTag.includes("talk to camera")) specificClass = "bg-[#e0f2fe] text-[#0369a1]";
            else if (lowerTag.includes("product demo") || lowerTag.includes("unboxing")) specificClass = "bg-[#ede9fe] text-[#5b21b6]";
            else if (lowerTag.includes("fitness")) specificClass = "bg-[#ffedd5] text-[#c2410c]";
            else if (lowerTag.includes("ad ready") || lowerTag.includes("skincare")) specificClass = "bg-[#dcfce7] text-[#15803d]";
            else if (lowerTag.includes("aesthetic")) specificClass = "bg-[#ccfbf1] text-[#0f766e]";
            else if (lowerTag.includes("tech")) specificClass = "bg-[#f3e8ff] text-[#7e22ce]";
            else if (lowerTag.includes("lifestyle")) specificClass = "bg-[#e0f2fe] text-[#0369a1]";
            else if (lowerTag.includes("ugc")) specificClass = "bg-[#dcfce7] text-[#15803d]";
            else {
              const colors = [
                "bg-fuchsia-100 text-fuchsia-700",
                "bg-blue-100 text-blue-700",
                "bg-indigo-100 text-indigo-700",
                "bg-orange-100 text-orange-700",
                "bg-emerald-100 text-emerald-700",
                "bg-teal-100 text-teal-700",
                "bg-purple-100 text-purple-700",
              ];
              specificClass = colors[i % colors.length]!;
            }

            return (
              <Badge
                key={tag}
                variant="secondary"
                className={cn("rounded-md px-3 py-1 text-xs font-medium border-none", specificClass)}
              >
                {tag}
              </Badge>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">
                {creator.ordersCompleted}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Completed Orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <Clock className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">
                95%
              </p>
              <p className="text-[11px] text-muted-foreground">
                On-time Delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-muted">
              <Star className="size-4 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight text-foreground">
                {creator.rating > 0 ? creator.rating.toFixed(1) : "New"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                ({creator.reviewCount} Reviews)
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 inline-flex flex-col rounded-xl border border-border p-3.5">
          <p className="text-xs font-semibold text-foreground mb-2.5">
            Can create with
          </p>
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Users className="size-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Partner</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Baby className="size-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Child</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <PawPrint className="size-5 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">Pets</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <CheckCircle2 className="size-4 shrink-0 text-primary" />
              {feature}
            </div>
          ))}
        </div>

        {creator.bio && (
          <div className="mt-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isBioExpanded || creator.bio.length <= 150
                ? creator.bio
                : `${creator.bio.slice(0, 150).trim()}...`}
            </p>
            {creator.bio.length > 150 && (
              <button
                type="button"
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="mt-1 text-sm font-semibold text-primary hover:underline"
              >
                {isBioExpanded ? "Show less" : "Read more ↓"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
