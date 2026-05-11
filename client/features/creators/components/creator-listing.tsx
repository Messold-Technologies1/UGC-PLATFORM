"use client";

import {
  type CSSProperties,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, Search, SlidersHorizontal, Users } from "lucide-react";
import { VirtuosoGrid } from "react-virtuoso";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { CreatorCard } from "./creator-card"; //, CreatorCardSkeleton
import { CreatorsBrowserLoadingShell } from "@/components/dashboard/route-loading-shells";
import {
  CREATOR_PRICE_MAX,
  CREATOR_PRICE_MIN,
  CreatorFilters,
  DEFAULT_FILTERS,
  type Filters,
} from "./creator-filters";
import {
  parseBrowseListingParams,
  serializeBrowseListingParams,
} from "../lib/browse-listing-url";
import { deriveCreatorFilterOptions } from "../lib/derive-filter-options";
import {
  useInfiniteCreatorsListQuery,
  type CreatorsListResult,
} from "../hooks/use-creators-list-query";

const BROWSE_LIST_LIMIT = 50;
const BRAND_CREATOR_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr7KglvvfKo8qFIxp2OdBVIrwuVS5qHkoG9kbVHXs1slOSSA/viewform?usp=header";

function stringArraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function filtersEqual(a: Filters, b: Filters): boolean {
  return (
    a.city === b.city &&
    stringArraysEqual(a.categories, b.categories) &&
    a.gender === b.gender &&
    a.minPrice === b.minPrice &&
    a.maxPrice === b.maxPrice &&
    a.onLocationAvailable === b.onLocationAvailable &&
    a.industry === b.industry &&
    a.portfolioTag === b.portfolioTag &&
    stringArraysEqual(a.personaTags, b.personaTags) &&
    stringArraysEqual(a.restrictions, b.restrictions)
  );
}

function formatPriceRangeForCopy(filters: Filters): string | null {
  if (!filters.minPrice && !filters.maxPrice) return null;
  const min = filters.minPrice ? Number(filters.minPrice) : CREATOR_PRICE_MIN;
  const max = filters.maxPrice ? Number(filters.maxPrice) : CREATOR_PRICE_MAX;
  const maxLabel =
    max >= CREATOR_PRICE_MAX ? "₹10,000+" : `₹${max.toLocaleString("en-IN")}`;
  return `₹${min.toLocaleString("en-IN")} - ${maxLabel}`;
}

function EmptyBrowseState({ filters }: { filters: Filters }) {
  const location = filters.city.trim();
  const priceLabel = formatPriceRangeForCopy(filters);
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
        {location ? (
          <>
            {" "}
            in <span className={accent}>{location}</span>
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

export function CreatorListing({
  initialData,
}: {
  initialData?: CreatorsListResult;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const parsedInitial = useMemo(
    () => parseBrowseListingParams(searchParams),
    [searchParams],
  );

  const [filters, setFilters] = useState<Filters>(() => parsedInitial.filters);
  const [showFilters, setShowFilters] = useState(true);

  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>();

  useEffect(() => {
    const parent = document.getElementById("main-content");
    if (parent) {
      requestAnimationFrame(() => {
        setScrollParent(parent);
      });
    }
  }, []);

  const listingRef = useRef({ filters });

  useEffect(() => {
    listingRef.current = { filters };
  }, [filters]);

  const syncUrlImmediate = useCallback(
    (nextFilters: Filters) => {
      const qs = serializeBrowseListingParams(nextFilters, "");
      if (qs === searchParamsKey) return;
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParamsKey],
  );

  const debouncedPushUrl = useDebouncedCallback(() => {
    const { filters: currentFilters } = listingRef.current;
    syncUrlImmediate(currentFilters);
  }, 500);

  useEffect(() => {
    const parsed = parseBrowseListingParams(
      new URLSearchParams(searchParamsKey),
    );
    startTransition(() => {
      setFilters((previous) =>
        filtersEqual(previous, parsed.filters) ? previous : parsed.filters,
      );
    });
    if (parsed.search) {
      syncUrlImmediate(parsed.filters);
    }
  }, [searchParamsKey, syncUrlImmediate]);

  const apiFilters = useMemo(
    () => ({
      limit: BROWSE_LIST_LIMIT,
      city: filters.city || undefined,
      categories: filters.categories,
      gender: filters.gender || undefined,
      industry: filters.industry || undefined,
      portfolioTag: filters.portfolioTag || undefined,
      onLocationAvailable: filters.onLocationAvailable || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      personaTags: filters.personaTags,
      restrictions: filters.restrictions,
    }),
    [filters],
  );

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCreatorsListQuery({
    filters: apiFilters,
    initialData:
      initialData &&
      initialData.page === 1 &&
      initialData.limit === BROWSE_LIST_LIMIT &&
      filtersEqual(parsedInitial.filters, DEFAULT_FILTERS)
        ? initialData
        : undefined,
  });

  const creators = useMemo(
    () => data?.pages.flatMap((page) => page.creators) ?? [],
    [data?.pages],
  );
  const { categoryOptions } = useMemo(
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
        Boolean(filters.city),
        filters.categories.length > 0,
        Boolean(filters.gender),
        Boolean(filters.minPrice || filters.maxPrice),
        filters.onLocationAvailable,
        Boolean(filters.industry),
        Boolean(filters.portfolioTag),
        filters.personaTags.length > 0,
        filters.restrictions.length > 0,
      ].filter(Boolean).length,
    [filters],
  );

  const handleFiltersChange = useCallback(
    (next: Filters) => {
      listingRef.current.filters = next;
      setFilters(next);
      debouncedPushUrl();
    },
    [debouncedPushUrl],
  );

  const handleResetFilters = useCallback(() => {
    listingRef.current.filters = DEFAULT_FILTERS;
    setFilters(DEFAULT_FILTERS);
    syncUrlImmediate(DEFAULT_FILTERS);
  }, [syncUrlImmediate]);

  const handleCloseFilters = useCallback(() => setShowFilters(false), []);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const displayedCount = data?.pages[0]?.total ?? 0;
  const desktopFilterRailStyle = {
    "--creators-filter-top": "6.5rem",
    "--creators-filter-gap": "1.5rem",
  } as CSSProperties;

  if (isPending && !data) {
    return <CreatorsBrowserLoadingShell />;
  }

  if (isError && !data) {
    return (
      <Card
        variant="dashedDestructive"
        className="flex min-h-80 flex-col items-center justify-center gap-3 px-4 text-center"
      >
        <p className="text-sm font-medium text-foreground">
          Could not load creators
        </p>
        <p className="max-w-md text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-medium text-primary underline underline-offset-2"
        >
          Try again
        </button>
      </Card>
    );
  }

  return (
    <div className="w-full min-w-0">
      {/* <header className="mb-10 md:mb-12">
        <h1 className="font-headline font-extrabold text-5xl tracking-tight mb-2">
          Browse Creators
        </h1>
        <p className="mt-2 max-w-4xl text-base text-muted-foreground md:text-lg xl:max-w-none">
          Find and hire talented UGC creators to bring your brand story to life.
        </p>
      </header> */}

      <div className="sticky top-0 z-30 mb-10">
        <div className="flex flex-col gap-4 p-4 py-3 backdrop-blur-sm md:flex-row md:items-center md:gap-6">
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
                {displayedCount.toLocaleString()} creators found
              </p>
              {isFetching && !isFetchingNextPage ? (
                <p className="text-xs text-muted-foreground">Updating…</p>
              ) : null}
            </div>
          </div>

          <div className="group relative min-w-0 w-full flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
            <Input
              placeholder="Search creators, niches, or locations…"
              value=""
              disabled
              aria-label="Creator search is currently unavailable"
              className="h-10 rounded-2xl py-2.5 pl-11 pr-4 text-sm"
            />
          </div>

          <a
            href={BRAND_CREATOR_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
          >
            Can&apos;t find the right fit? 
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 flex min-h-[min(22rem,50vh)] flex-col lg:min-h-112",
          showFilters
            ? "gap-8 lg:flex-row lg:items-start"
            : "lg:flex-row lg:items-start",
        )}
      >
        <div
          className={cn(
            "shrink-0 overflow-hidden transition-[width,max-height,opacity] duration-300 ease-out lg:overflow-visible",
            showFilters
              ? "max-h-[min(72vh,40rem)] w-full opacity-100 lg:h-fit lg:sticky lg:top-(--creators-filter-top) lg:max-h-none lg:w-80 lg:min-w-80 lg:max-w-80 lg:self-start"
              : "pointer-events-none max-h-0 w-full opacity-0 lg:max-h-none lg:w-0 lg:min-w-0",
          )}
          aria-hidden={!showFilters}
          style={desktopFilterRailStyle}
        >
          <div className="h-auto">
            <CreatorFilters
              filters={filters}
              onChange={handleFiltersChange}
              onClose={handleCloseFilters}
              categoryOptions={categoryOptions}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          {creators.length > 0 ? (
            <>
              <VirtuosoGrid
                useWindowScroll={!scrollParent}
                customScrollParent={scrollParent}
                data={creators}
                endReached={handleEndReached}
                listClassName={cn(
                  "grid w-full gap-x-5 gap-y-6",
                  showFilters
                    ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
                    : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5",
                )}
                itemClassName="min-w-0 h-full"
                components={{
                  Footer: () => {
                    if (!isFetchingNextPage) return null;
                    return (
                      <div className="col-span-full flex justify-center py-8 text-xs font-medium text-muted-foreground">
                        Loading more creators…
                      </div>
                    );
                  },
                }}
                itemContent={(_index, creator) => (
                  <CreatorCard
                    creator={creator}
                    variant="listing"
                    appearance="browse"
                  />
                )}
              />
            </>
          ) : (
            <EmptyBrowseState filters={filters} />
          )}
        </div>
      </div>
    </div>
  );
}
