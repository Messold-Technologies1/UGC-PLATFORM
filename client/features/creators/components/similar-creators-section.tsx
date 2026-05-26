"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ChevronRight } from "lucide-react";
import { useSuggestedCreatorsQuery } from "../hooks/use-suggested-creators-query";
import type { Creator } from "../types";
import type { SuggestedCreatorListItemApi } from "../api/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface SimilarCreatorsSectionProps {
  currentCreatorId?: string;
}

function parsePrice(value: string | null | undefined) {
  const price = Number.parseFloat(value ?? "");
  return Number.isFinite(price) ? Math.round(price) : 0;
}

function normalizeThumbnailUrl(value: string | null | undefined) {
  const url = value?.trim();
  if (!url) return "";
  return url.startsWith("https://") || url.startsWith("/") ? url : "";
}

function mapSuggestedCreatorToCreator(
  suggestion: SuggestedCreatorListItemApi,
): Creator {
  const tags = suggestion.contentCategories
    .map((category) => category.label.trim())
    .filter(Boolean);
  const category = tags[0] ?? "General";
  const thumbnail = normalizeThumbnailUrl(
    suggestion.firstPortfolioVideo?.thumbnailUrl,
  );

  return {
    id: suggestion.id,
    name: suggestion.creatorName,
    location: suggestion.city?.trim() || "Location not set",
    rating: 0,
    reviewCount: 0,
    startingPrice: parsePrice(suggestion.priceAmount),
    ordersCompleted: 0,
    thumbnail,
    previewVideoUrl: suggestion.firstPortfolioVideo?.videoUrl ?? null,
    previewVideoThumbnail: thumbnail,
    tags,
    available: true,
    storeVisit: false,
    travelAvailable: false,
    gender: "other",
    category,
    categories: tags.length > 0 ? tags : [category],
    languages: [],
    deliveryDays: 5,
    basicEditing: true,
  };
}

export function SimilarCreatorsSection({
  currentCreatorId,
}: SimilarCreatorsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isPending, isError } = useSuggestedCreatorsQuery({
    creatorId: currentCreatorId ?? "",
    enabled: Boolean(currentCreatorId),
  });

  const creators: Creator[] = (data ?? [])
    .filter((suggestion) => suggestion.id !== currentCreatorId)
    .map(mapSuggestedCreatorToCreator);

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" });
  };

  if (!currentCreatorId) return null;

  if (isPending) {
    return (
      <section className="mt-5">
        <h2 className="text-xl font-bold text-foreground">
          You may also like
        </h2>
        <div className="flex gap-5 mt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex min-w-[240px] max-w-[260px] shrink-0 gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="size-14 shrink-0 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (isError || creators.length === 0) {
    return (
      <section className="mt-5">
        <h2 className="text-xl font-bold text-foreground">
          You may also like
        </h2>
        <div className="mt-5 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No suggestions available at the moment
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <h2 className="text-xl font-bold text-foreground">You may also like</h2>

      <div className="relative mt-5">
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        >
          {creators.map((c) => (
            <Link
              key={c.id}
              href={`/brand/creators/${c.id}`}
              className="flex min-w-[240px] max-w-[260px] shrink-0 gap-3 rounded-xl border border-border bg-card p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted overflow-hidden">
                {c.thumbnail ? (
                  <Image
                    src={c.thumbnail}
                    alt={c.name}
                    width={56}
                    height={56}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {getInitials(c.name)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {c.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.tags.slice(0, 2).join(" • ")}
                </p>
                <p className="text-xs text-muted-foreground">{c.location}</p>

                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {c.startingPrice > 0
                      ? `₹${c.startingPrice.toLocaleString("en-IN")}`
                      : "Price on request"}
                  </span>
                  {c.rating > 0 || c.ordersCompleted > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {c.rating} ({c.ordersCompleted})
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {creators.length > 4 && (
          <button
            type="button"
            onClick={scrollRight}
            className="absolute -right-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-border bg-card shadow-md hover:bg-muted transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>
    </section>
  );
}
