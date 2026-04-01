"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Search, Users } from "lucide-react";
import { VirtuosoGrid } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatorCard } from "./creator-card";
import {
  CREATOR_PRICE_MAX,
  CREATOR_PRICE_MIN,
  CreatorFilters,
  DEFAULT_FILTERS,
  type Filters,
} from "./creator-filters";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  parseBrowseListingParams,
  serializeBrowseListingParams,
} from "../lib/browse-listing-url";
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
  if (creators.length === 0) return creators;
  const q = search.trim().toLowerCase();
  const minP = filters.minPrice ? Number(filters.minPrice) : null;
  const maxP = filters.maxPrice ? Number(filters.maxPrice) : null;
  const minR = filters.minRating ? Number(filters.minRating) : null;

  return creators.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (filters.city !== "All Cities" && c.location !== filters.city)
      return false;
    if (filters.category !== "All") {
      const cats = c.categories?.length ? c.categories : [c.category];
      if (!cats.includes(filters.category)) return false;
    }
    if (filters.gender !== "all" && c.gender !== filters.gender) return false;
    if (minP != null && c.startingPrice < minP) return false;
    if (maxP != null && c.startingPrice > maxP) return false;
    if (minR != null && c.rating < minR) return false;
    if (filters.travelAvailable && !c.travelAvailable) return false;
    if (filters.storeVisit && !c.storeVisit) return false;
    return true;
  });
}

function formatPriceRangeForCopy(f: Filters): string | null {
  if (!f.minPrice && !f.maxPrice) return null;
  const min = f.minPrice ? Number(f.minPrice) : CREATOR_PRICE_MIN;
  const max = f.maxPrice ? Number(f.maxPrice) : CREATOR_PRICE_MAX;
  const maxLabel =
    max >= CREATOR_PRICE_MAX ? "₹10,000+" : `₹${max.toLocaleString("en-IN")}`;
  return `₹${min.toLocaleString("en-IN")} – ${maxLabel}`;
}

function EmptyBrowseState({
  filters,
  searchQuery,
}: {
  filters: Filters;
  searchQuery: string;
}) {
  const loc = filters.city !== "All Cities" ? filters.city : "";
  const priceLabel = formatPriceRangeForCopy(filters);
  const q = searchQuery.trim();
  const accent = "font-medium text-foreground";

  return (
    <div className="flex min-h-[min(20rem,45vh)] flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 lg:min-h-0">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Users className="size-6 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-center text-lg font-semibold text-foreground">
        No matches found
      </p>
      <p className="mt-2 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
        We couldn&apos;t find creators matching your filters
        {q ? (
          <>
            {" "}
            for <span className={accent}>&quot;{q}&quot;</span>
          </>
        ) : null}
        {loc ? (
          <>
            {" "}
            in <span className={accent}>{loc}</span>
          </>
        ) : null}
        {priceLabel ? (
          <>
            {" "}
            in the <span className={accent}>{priceLabel}</span> range
          </>
        ) : null}
        .
      </p>
    </div>
  );
}

interface CreatorListingProps {
  creators: Creator[];
  
  listMeta?: { page: number; limit: number; total: number };
}

export function CreatorListing({ creators, listMeta }: CreatorListingProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const [search, setSearch] = useState(
    () => parseBrowseListingParams(searchParams).search,
  );
  const [filters, setFilters] = useState<Filters>(() =>
    parseBrowseListingParams(searchParams).filters,
  );
  const [showFilters, setShowFilters] = useState(false);

  const listingRef = useRef({ filters, search });

  useEffect(() => {
    listingRef.current = { filters, search };
  }, [filters, search]);

  const deferredSearch = useDeferredValue(search);

  const syncUrlImmediate = useCallback(
    (nextFilters: Filters, nextSearch: string) => {
      const qs = serializeBrowseListingParams(nextFilters, nextSearch);
      if (qs === searchParamsKey) return;
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParamsKey],
  );

  const debouncedPushUrl = useDebouncedCallback(() => {
    const { filters: f, search: s } = listingRef.current;
    syncUrlImmediate(f, s);
  }, 300);

  useEffect(() => {
    const parsed = parseBrowseListingParams(
      new URLSearchParams(searchParamsKey),
    );
    startTransition(() => {
      setFilters((prev) =>
        filtersEqual(prev, parsed.filters) ? prev : parsed.filters,
      );
      setSearch((prev) => (prev === parsed.search ? prev : parsed.search));
    });
  }, [searchParamsKey]);

  const handleFiltersChange = useCallback(
    (next: Filters) => {
      setFilters(next);
      debouncedPushUrl();
    },
    [debouncedPushUrl],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      debouncedPushUrl();
    },
    [debouncedPushUrl],
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

  const totalPages =
    listMeta && listMeta.limit > 0
      ? Math.max(1, Math.ceil(listMeta.total / listMeta.limit))
      : null;

  return (
    <div className="w-full min-w-0">
      <header className="mb-10 md:mb-12">
        <h1 className="text-4xl font-extrabold tracking-tighter text-foreground md:text-5xl">
          Browse Creators
        </h1>
        <p className="mt-2 max-w-4xl text-base text-muted-foreground md:text-lg xl:max-w-none">
          Find and hire talented UGC creators to bring your brand story to life
          with authentic content.
        </p>
      </header>

      <div className="sticky top-0 z-30 mb-10">
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/40 p-4 backdrop-blur-sm md:flex-row md:items-center md:gap-6">
          <div className="flex w-full shrink-0 flex-col gap-4 sm:flex-row sm:items-center md:w-auto">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="size-3.5" />
                All filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
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

            <div className="hidden h-8 w-px shrink-0 bg-border md:block" />

            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
              <p className="whitespace-nowrap text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {results.length.toLocaleString()} creators found
              </p>
              {listMeta && totalPages != null && (
                <p className="text-xs text-muted-foreground">
                  Page {listMeta.page} of {totalPages} ·{" "}
                  {listMeta.total.toLocaleString()} total
                </p>
              )}
            </div>
          </div>

          <div className="group relative min-w-0 w-full flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
            <Input
              placeholder="Search creators, niches, or locations…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 rounded-full py-2.5 pl-11 pr-4 text-sm"
            />
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
              ? "max-h-[min(72vh,40rem)] w-full opacity-100 lg:max-h-none lg:w-80 lg:min-w-80 lg:max-w-80"
              : "pointer-events-none max-h-0 w-full opacity-0 lg:max-h-none lg:w-0 lg:min-w-0",
          )}
          aria-hidden={!showFilters}
        >
          <div className="h-full lg:sticky lg:top-36 lg:self-start">
            <CreatorFilters
              filters={filters}
              onChange={handleFiltersChange}
              onClose={handleCloseFilters}
              categoryOptions={categoryOptions}
              cityOptions={cityOptions}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {results.length > 0 ? (
            <VirtuosoGrid
              useWindowScroll
              data={results}
              listClassName={cn(
                "grid w-full gap-x-6 gap-y-8",
                showFilters
                  ? "sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                  : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
              )}
              itemClassName="min-w-0 h-full"
              itemContent={(_index, creator) => (
                <CreatorCard
                  creator={creator}
                  variant="listing"
                  appearance="browse"
                />
              )}
            />
          ) : (
            <EmptyBrowseState
              filters={filters}
              searchQuery={deferredSearch}
            />
          )}
        </div>
      </div>
    </div>
  );
}
