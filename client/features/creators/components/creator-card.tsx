import React, { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Star,
  ShoppingBag,
  Play,
  Pause,
  // MoveRight,
  Truck,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Creator } from "../types";

interface CreatorCardProps {
  creator: Creator;
  variant?: "featured" | "listing";

  appearance?: "standard" | "browse";
}

export const CreatorCard = memo(function CreatorCard({
  creator,
  variant = "listing",
  appearance = "standard",
}: CreatorCardProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);

  const profileUrl = `/brand/creators/${creator.id}`;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const isFeatured = variant === "featured";
  const isBrowse = appearance === "browse" && !isFeatured;
  const browseTags = creator.tags.slice(0, 3);
  const standardTags = creator.tags.slice(0, 3);
  const hasPreviewVideo =
    typeof creator.previewVideoUrl === "string" &&
    (creator.previewVideoUrl.startsWith("http://") ||
      creator.previewVideoUrl.startsWith("https://"));
  const previewPoster = creator.previewVideoThumbnail || creator.thumbnail;
  const mediaAlt = `${creator.name}'s content`;
  const locationLabel = creator.location || "Location not set";
  const categoryLabel = creator.category || "General";

  if (isBrowse) {
    return (
      <article
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-3xl border-2 border-foreground/90 bg-card shadow-pop transition-all duration-300 hover:-translate-y-1 hover:shadow-hard",
        )}
      >
        <div className="relative aspect-10/11 overflow-hidden bg-muted">
          {hasPreviewVideo ? (
            <div
              className="relative size-full cursor-pointer"
              onClick={handleTogglePlay}
            >
              <video
                ref={videoRef}
                key={creator.previewVideoUrl}
                src={creator.previewVideoUrl ?? undefined}
                poster={previewPoster}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                muted
                loop
                playsInline
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <div
                className={cn(
                  "absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity",
                  isPlaying
                    ? "opacity-0 group-hover:opacity-100"
                    : "opacity-100",
                )}
              >
                <div className="flex size-14 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-black/50">
                  {isPlaying ? (
                    <Pause className="size-6 fill-white" />
                  ) : (
                    <Play className="ml-1 size-6 fill-white" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <Image
              src={creator.thumbnail}
              alt={mediaAlt}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
              priority
            />
          )}
          <div className="absolute bottom-3 left-3 rounded-sm bg-black/60 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">
            ₹{creator.startingPrice.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-3">
          <h3 className="text-base font-bold text-foreground tracking-tight">
            {creator.name}
          </h3>
          
          <div className="mt-0.5 flex items-center text-xs text-muted-foreground">
            <span>{locationLabel}</span>
            {creator.languages && creator.languages.length > 0 && (
              <>
                <span className="mx-1.5">•</span>
                <span>{creator.languages.join(", ")}</span>
              </>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {browseTags.map((tag, i) => {
              const lowerTag = tag.toLowerCase();
              let specificClass = "";
              if (lowerTag.includes("beauty")) specificClass = "bg-[#fce7f3] text-[#be185d]";
              else if (lowerTag.includes("casual") || lowerTag.includes("talk to camera")) specificClass = "bg-[#e0f2fe] text-[#0369a1]";
              else if (lowerTag.includes("product demo") || lowerTag.includes("unboxing")) specificClass = "bg-[#ede9fe] text-[#5b21b6]";
              else if (lowerTag.includes("fitness")) specificClass = "bg-[#ffedd5] text-[#c2410c]";
              else if (lowerTag.includes("ad ready") || lowerTag.includes("skincare")) specificClass = "bg-[#dcfce7] text-[#15803d]";
              else if (lowerTag.includes("aesthetic")) specificClass = "bg-[#ccfbf1] text-[#0f766e]";
              else if (lowerTag.includes("tech")) specificClass = "bg-[#f3e8ff] text-[#7e22ce]";
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
                  className={cn("rounded-md px-2.5 py-0.5 text-[11px] font-medium border-none", specificClass)}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>

          <div className="mt-3.5 flex flex-col gap-2.5 text-[13px] text-muted-foreground font-medium">
            <div className="flex items-center gap-3">
              <ShoppingBag className="size-4 shrink-0 text-muted-foreground/70" />
              <span>{creator.ordersCompleted} completed orders</span>
            </div>
            <div className="flex items-center gap-3">
              <Truck className="size-4 shrink-0 text-muted-foreground/70" />
              <span>Delivery in {creator.deliveryDays || 5} days</span>
            </div>
            <div className="flex items-center gap-3">
              <Wand2 className={cn("size-4 shrink-0", creator.basicEditing ? "text-muted-foreground/70" : "text-muted-foreground/40")} />
              <span className={!creator.basicEditing ? "text-muted-foreground/70" : ""}>
                {creator.basicEditing ? "Basic editing included" : "Basic editing not included"}
              </span>
            </div>
          </div>

          <div className="mt-auto w-full pt-6 flex justify-center">
            <Button
              asChild
              variant="outline"
              className="w-full text-sm font-semibold rounded-md border-border/60 bg-[#111] text-white hover:bg-muted"
            >
              <Link href={profileUrl}>
                View Profile
              </Link>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Card interactive="emphasized">
      <div className="relative aspect-4/5 overflow-hidden bg-muted">
        {hasPreviewVideo ? (
          <div
            className="relative size-full cursor-pointer"
            onClick={handleTogglePlay}
          >
            <video
              ref={videoRef}
              key={creator.previewVideoUrl}
              src={creator.previewVideoUrl ?? undefined}
              poster={previewPoster}
              className="size-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
            <div
              className={cn(
                "absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-opacity",
                isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100",
              )}
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-transform hover:scale-110 hover:bg-black/60">
                {isPlaying ? (
                  <Pause className="size-6 fill-white" />
                ) : (
                  <Play className="ml-1 size-6 fill-white" />
                )}
              </div>
            </div>
          </div>
        ) : (
          <Image
            src={creator.thumbnail}
            alt={mediaAlt}
            fill
            className="object-cover"
            sizes={
              isFeatured
                ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            }
            priority
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/65 via-black/20 to-black/5" />
        <div className="absolute left-3 top-3 right-3 flex items-start justify-end gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-white backdrop-blur-sm">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium">{creator.rating}</span>
            <span className="text-[10px] text-white/70">
              ({creator.reviewCount})
            </span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="line-clamp-2 text-lg font-semibold leading-6">
            {creator.name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/85">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/12 px-2.5 py-1 backdrop-blur-sm">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">{locationLabel}</span>
            </span>
            <span className="rounded-full bg-white/12 px-2.5 py-1 backdrop-blur-sm">
              {categoryLabel}
            </span>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {!isFeatured && (
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              <ShoppingBag className="mr-1 size-3" />
              {creator.ordersCompleted} orders
            </Badge>
            {creator.travelAvailable && (
              <Badge
                variant="outline"
                className="border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                Travels
              </Badge>
            )}
            {creator.storeVisit && (
              <Badge
                variant="outline"
                className="border-border/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                On-location
              </Badge>
            )}
          </div>
        )}

        {!isFeatured && creator.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {standardTags.map((tag) => (
              <Badge key={tag} variant="muted" className="px-1.5 py-0 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Starting from
            </p>
            <p className="text-sm font-bold">
              ₹{creator.startingPrice.toLocaleString("en-IN")}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href={profileUrl}>View Profile</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
