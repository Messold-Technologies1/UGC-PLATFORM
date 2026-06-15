"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Star, Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRemoveWishlistCreatorMutation } from "../hooks/use-remove-wishlist-creator-mutation";
import type { WishlistCreator } from "../api/types";

const GRADIENTS = [
  "from-violet-600 to-pink-500",
  "from-orange-500 to-red-400",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-orange-400",
  "from-amber-500 to-pink-500",
  "from-cyan-500 to-blue-600",
  "from-purple-600 to-rose-500",
];

const TAG_COLORS = [
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-purple-100 text-purple-700",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface WishlistCreatorCardProps {
  creator: WishlistCreator;
  wishlistId: string;
  index: number;
}

export function WishlistCreatorCard({ creator, wishlistId, index }: WishlistCreatorCardProps) {
  const removeMutation = useRemoveWishlistCreatorMutation();
  const [videoError, setVideoError] = useState(false);

  const gradient = GRADIENTS[index % GRADIENTS.length]!;
  const initials = getInitials(creator.name);
  const hasVideo =
    !videoError &&
    typeof creator.introVideoUrl === "string" &&
    creator.introVideoUrl.startsWith("http");
  const hasThumbnail =
    typeof creator.profileImageUrl === "string" &&
    creator.profileImageUrl.startsWith("http");

  const tags = (creator.facetSelections ?? [])
    .filter((f) => f.dimension === "CONTENT_TYPE" || f.dimension === "NICHE" || f.dimension === "STYLE")
    .map((f) => f.label)
    .slice(0, 3);

  const minPrice = creator.packages && creator.packages.length > 0
    ? Math.min(...creator.packages.map((p) => Number(p.priceAmount)))
    : null;

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeMutation.mutateAsync({ wishlistId, creatorId: creator.id });
      toast.success("Removed from wishlist");
    } catch {
      toast.error("Failed to remove creator");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/brand/creators/${creator.id}`} className="block group">
        <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "10/14" }}>
          {hasVideo ? (
            <video
              src={creator.introVideoUrl ?? undefined}
              className="absolute inset-0 size-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setVideoError(true)}
            />
          ) : hasThumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={creator.profileImageUrl!}
              alt={creator.name}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", gradient)} />
          )}

          {/* Overlay gradient at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Initials shown when no media */}
          {!hasVideo && !hasThumbnail && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-bold text-white/90">{initials}</span>
            </div>
          )}

          {/* Rating badge top-left */}
          {creator.avgRating && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow">
              <Star className="size-3 fill-white" />
              {Number(creator.avgRating).toFixed(1)}
            </div>
          )}

          {/* Heart/remove button top-right */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={removeMutation.isPending}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-110"
            aria-label="Remove from wishlist"
          >
            {removeMutation.isPending ? (
              <Loader2 size={14} className="animate-spin text-rose-500" />
            ) : (
              <Heart size={15} className="fill-rose-500 text-rose-500" />
            )}
          </button>

          {/* Bottom info overlay */}
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <p className="font-bold text-sm leading-tight">
              {creator.name}
            </p>
            {(creator.city || (creator.languages && creator.languages.length > 0)) && (
              <p className="mt-0.5 text-[11px] text-white/80 flex items-center gap-1">
                {creator.city && (
                  <>
                    <MapPin size={10} className="shrink-0" />
                    <span>{creator.city}</span>
                  </>
                )}
                {creator.city && creator.languages && creator.languages.length > 0 && (
                  <span className="opacity-60">·</span>
                )}
                {creator.languages && creator.languages.length > 0 && (
                  <span>{creator.languages.slice(0, 2).join(", ")}</span>
                )}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Tags below card */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-0.5">
          {tags.map((tag, i) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-medium border-none",
                TAG_COLORS[i % TAG_COLORS.length]
              )}
            >
              {tag}
            </Badge>
          ))}
          {minPrice !== null && (
            <span className="ml-auto text-xs text-muted-foreground font-medium self-center">
              from ₹{minPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
