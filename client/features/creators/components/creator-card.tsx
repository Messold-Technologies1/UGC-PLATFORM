import { memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Play, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Creator } from "../types";

interface CreatorCardProps {
  creator: Creator;
  variant?: "featured" | "listing";
}

export const CreatorCard = memo(function CreatorCard({ creator, variant = "listing" }: CreatorCardProps) {
  const isFeatured = variant === "featured";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-xl hover:shadow-primary/5">
      <div className="relative aspect-4/3 overflow-hidden bg-muted">
        <Image
          src={creator.thumbnail}
          alt={`${creator.name}'s content`}
          fill
          className="object-cover"
          sizes={isFeatured
            ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          }
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/5">
          <div className="flex size-12 items-center justify-center rounded-full bg-background/80 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110" aria-label="Play video">
            <Play className="size-5 text-foreground ml-0.5" aria-hidden="true" />
          </div>
        </div>

        {creator.available && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            Available
          </span>
        )}
      </div>

      <div className="p-4">
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
              <Badge key={tag} variant="muted" className="text-xs px-1.5 py-0">
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
      </div>
    </div>
  );
});
