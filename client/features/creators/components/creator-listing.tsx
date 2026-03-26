"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatorCard } from "./creator-card";
import {
  CreatorFilters,
  DEFAULT_FILTERS,
  type Filters,
} from "./creator-filters";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { deriveCreatorFilterOptions } from "../lib/derive-filter-options";
import type { Creator } from "../types";

function filtersEqual(a: Filters, b: Filters): boolean {
  return (
    a.city === b.city &&
    a.category === b.category &&
    a.gender === b.gender &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.minRating === b.minRating &&
    a.travelAvailable === b.travelAvailable &&
    a.storeVisit === b.storeVisit
  );
}

function applyFilters(
  creators: Creator[],
  filters: Filters,
  search: string,
): Creator[] {
  return creators.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    if (filters.city !== "All Cities" && c.location !== filters.city)
      return false;
    if (filters.category !== "All" && c.category !== filters.category)
      return false;
    if (filters.gender !== "all" && c.gender !== filters.gender) return false;
    if (filters.minPrice && c.startingPrice < Number(filters.minPrice))
      return false;
    if (filters.maxPrice && c.startingPrice > Number(filters.maxPrice))
      return false;
    if (filters.minRating && c.rating < Number(filters.minRating)) return false;
    if (filters.travelAvailable && !c.travelAvailable) return false;
    if (filters.storeVisit && !c.storeVisit) return false;
    return true;
  });
}

interface CreatorListingProps {
  creators: Creator[];
  /** First-page stats from `GET /api/creators` (more pages: TODO infinite scroll). */
  listMeta?: { page: number; limit: number; total: number };
}

export function CreatorListing({ creators, listMeta }: CreatorListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>(() => ({
    city: searchParams.get("city") ?? DEFAULT_FILTERS.city,
    category: searchParams.get("category") ?? DEFAULT_FILTERS.category,
    gender: searchParams.get("gender") ?? DEFAULT_FILTERS.gender,
    minPrice: searchParams.get("minPrice") ?? DEFAULT_FILTERS.minPrice,
    maxPrice: searchParams.get("maxPrice") ?? DEFAULT_FILTERS.maxPrice,
    minRating: searchParams.get("minRating") ?? DEFAULT_FILTERS.minRating,
    travelAvailable: searchParams.get("travel") === "true",
    storeVisit: searchParams.get("storeVisit") === "true",
  }));
  const [showFilters, setShowFilters] = useState(false);

  const deferredSearch = useDeferredValue(search);

  const syncUrlImmediate = useCallback(
    (nextFilters: Filters, nextSearch: string) => {
      const params = new URLSearchParams();
      if (nextSearch) params.set("q", nextSearch);
      if (nextFilters.city !== DEFAULT_FILTERS.city)
        params.set("city", nextFilters.city);
      if (nextFilters.category !== DEFAULT_FILTERS.category)
        params.set("category", nextFilters.category);
      if (nextFilters.gender !== DEFAULT_FILTERS.gender)
        params.set("gender", nextFilters.gender);
      if (nextFilters.minPrice) params.set("minPrice", nextFilters.minPrice);
      if (nextFilters.maxPrice) params.set("maxPrice", nextFilters.maxPrice);
      if (nextFilters.minRating) params.set("minRating", nextFilters.minRating);
      if (nextFilters.travelAvailable) params.set("travel", "true");
      if (nextFilters.storeVisit) params.set("storeVisit", "true");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router],
  );

  const syncUrl = useDebouncedCallback(syncUrlImmediate, 300);

  const handleFiltersChange = useCallback(
    (next: Filters) => {
      setFilters(next);
      syncUrl(next, search);
    },
    [search, syncUrl],
  );

  const results = useMemo(
    () => applyFilters(creators, filters, deferredSearch),
    [creators, filters, deferredSearch],
  );

  const { categoryOptions, cityOptions } = useMemo(
    () => deriveCreatorFilterOptions(creators),
    [creators],
  );

  const hasActiveFilters = useMemo(
    () => !filtersEqual(filters, DEFAULT_FILTERS),
    [filters],
  );

  const activeFilterCount = useMemo(
    () =>
      [
        filters.city !== DEFAULT_FILTERS.city,
        filters.category !== DEFAULT_FILTERS.category,
        filters.gender !== DEFAULT_FILTERS.gender,
        filters.minPrice !== DEFAULT_FILTERS.minPrice ||
          filters.maxPrice !== DEFAULT_FILTERS.maxPrice,
        filters.minRating !== DEFAULT_FILTERS.minRating,
        filters.travelAvailable !== DEFAULT_FILTERS.travelAvailable,
        filters.storeVisit !== DEFAULT_FILTERS.storeVisit,
      ].filter(Boolean).length,
    [filters],
  );

  const handleResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    syncUrlImmediate(DEFAULT_FILTERS, search);
  }, [search, syncUrlImmediate]);

  const handleCloseFilters = useCallback(() => setShowFilters(false), []);

  const handleClearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    syncUrlImmediate(DEFAULT_FILTERS, "");
  }, [syncUrlImmediate]);

  const totalPages =
    listMeta && listMeta.limit > 0
      ? Math.max(1, Math.ceil(listMeta.total / listMeta.limit))
      : null;

  return (
    <div>
      <div className="sticky top-0 z-20 space-y-4 border-b border-border/70 bg-background pb-5 pt-0">
        {listMeta && totalPages != null && (
          <p className="text-xs text-muted-foreground">
            Page {listMeta.page} of {totalPages} · {listMeta.total} creator
            {listMeta.total !== 1 ? "s" : ""} total
            {/* TODO: infinite scroll — append further pages as the user scrolls instead of pagination controls. */}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              className="gap-1.5 rounded-full px-4"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
            >
              <SlidersHorizontal className="size-3.5" />
              All filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search creators…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <p className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 flex min-h-[min(22rem,50vh)] flex-col lg:min-h-112",
          showFilters ? "gap-8 lg:flex-row lg:items-stretch" : "lg:flex-row",
        )}
      >
        <div
          className={cn(
            "shrink-0 overflow-hidden transition-[width,max-height,opacity] duration-300 ease-out",
            showFilters
              ? "max-h-[min(72vh,40rem)] w-full opacity-100 lg:max-h-none lg:w-74 lg:min-w-74"
              : "pointer-events-none max-h-0 w-full opacity-0 lg:max-h-none lg:w-0 lg:min-w-0",
          )}
          aria-hidden={!showFilters}
        >
          <div className="h-full lg:sticky lg:top-28 lg:self-start">
            <CreatorFilters
              filters={filters}
              onChange={handleFiltersChange}
              onReset={handleResetFilters}
              onClose={handleCloseFilters}
              categoryOptions={categoryOptions}
              cityOptions={cityOptions}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {results.length > 0 ? (
            <div
              className={cn(
                "grid w-full gap-x-6 gap-y-8",
                showFilters
                  ? "sm:grid-cols-2 xl:grid-cols-3"
                  : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              )}
            >
              {results.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  variant="listing"
                />
              ))}
            </div>
          ) : (
            <div className="flex min-h-[min(20rem,45vh)] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 py-12 lg:min-h-0">
              <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <p className="text-center text-sm font-medium">
                No creators match your filters
              </p>
              <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">
                Try adjusting your search or filter criteria to find more
                creators.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-6"
                onClick={handleClearAll}
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
