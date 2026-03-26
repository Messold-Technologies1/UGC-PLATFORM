import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Play, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Creator } from "../types";

interface CreatorCardProps {
  creator: Creator;
  variant?: "featured" | "listing";
  /** Rich browse-marketplace styling (brand creators page). */
  appearance?: "standard" | "browse";
}

export const CreatorCard = memo(function CreatorCard({
  creator,
  variant = "listing",
  appearance = "standard",
}: CreatorCardProps) {
  const isFeatured = variant === "featured";
  const isBrowse = appearance === "browse" && !isFeatured;

  if (isBrowse) {
    return (
      <article
        className={cn(
          "group creator-browse-lift relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md",
        )}
      >
        <div className="relative aspect-4/3 overflow-hidden bg-muted">
          <Image
            src={creator.thumbnail}
            alt={`${creator.name}'s content`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
          />
          <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/5" />
          {creator.available && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-white/90" />
              Available
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div
              className="flex size-12 items-center justify-center rounded-full border border-border/80 bg-background/90 shadow-lg backdrop-blur-sm dark:bg-card/95"
              aria-label="Play showreel"
            >
              <Play className="ml-0.5 size-5 text-foreground" aria-hidden />
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold leading-tight text-foreground">
                {creator.name}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {creator.location}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2 py-1 dark:bg-amber-950/30">
              <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                {creator.rating}
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({creator.reviewCount})
              </span>
            </div>
          </div>

          <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShoppingBag className="size-3.5 shrink-0" />
            {creator.ordersCompleted} orders completed
          </div>

          {creator.tags.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-1.5">
              {creator.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="border-border/80 px-2.5 py-0.5 text-[10px] font-medium"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Starting from
              </span>
              <span className="text-lg font-bold text-foreground">
                ₹{creator.startingPrice.toLocaleString("en-IN")}
              </span>
            </div>
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link href={`/creators/${creator.id}`}>View Profile</Link>
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <Card interactive="emphasized">
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <Image
          src={creator.thumbnail}
          alt={`${creator.name}'s content`}
          fill
          className="object-cover"
          sizes={
            isFeatured
              ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          }
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
          <div
            className="flex size-12 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110"
            aria-label="Play video"
          >
            <Play
              className="ml-0.5 size-5 text-foreground"
              aria-hidden="true"
            />
          </div>
        </div>

        {creator.available && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-white" />
            Available
          </span>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium">{creator.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              {creator.location}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 dark:bg-amber-950/30">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {creator.rating}
            </span>
            <span className="text-xs text-muted-foreground">
              ({creator.reviewCount})
            </span>
          </div>
        </div>

        {!isFeatured && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <ShoppingBag className="size-3 shrink-0" />
            {creator.ordersCompleted} orders completed
          </div>
        )}

        {!isFeatured && creator.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {creator.tags.map((tag) => (
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
            <Link href={`/creators/${creator.id}`}>View Profile</Link>
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
      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <Skeleton className="aspect-4/3 w-full rounded-none" />
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-[70%]" />
              <Skeleton className="h-3.5 w-[45%]" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0 rounded-lg" />
          </div>
          <Skeleton className="h-3.5 w-36" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-4/3 w-full rounded-none rounded-t-2xl" />
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-[70%]" />
            <Skeleton className="h-3 w-[45%]" />
          </div>
          <Skeleton className="h-7 w-20 shrink-0 rounded-md" />
        </div>
        <Skeleton className="h-3 w-36" />
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
