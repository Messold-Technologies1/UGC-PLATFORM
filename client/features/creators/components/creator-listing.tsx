"use client";

import "./browse-creators/browse-creators.css";

import {
  forwardRef,
  type HTMLAttributes,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { VirtuosoGrid } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { CreatorCardSkeleton } from "./creator-card";
import { ReelCard } from "./browse-creators/reel-card";
import { ProfileDrawer } from "./browse-creators/profile-drawer";
import { SaveToWishlistModal } from "@/features/wishlists/components/save-to-wishlist-modal";
import { useAuth } from "@/providers/auth-provider";
import type { Creator } from "../types";
import { CreatorFilterBar } from "./creator-filter-bar";
import {
  CREATOR_PRICE_MAX,
  CREATOR_PRICE_MIN,
  DEFAULT_FILTERS,
  type Filters,
} from "../types/creator-filter-types";
import {
  parseBrowseListingParams,
  serializeBrowseListingParams,
} from "../lib/browse-listing-url";
import { deriveCreatorFilterOptions } from "../lib/derive-filter-options";
import {
  useInfiniteCreatorsListQuery,
  type CreatorsListResult,
} from "../hooks/use-creators-list-query";

const BROWSE_LIST_LIMIT = 24;
const LANDING_PAGE_CREATOR_LIMIT = 10;

const virtuosoGridComponents = {
  List: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    function CreatorGridList({ className, ...props }, ref) {
      return (
        <div
          ref={ref}
          {...props}
          className={cn("reelgrid browse-redesign-scope", className)}
        />
      );
    },
  ),
  Item: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    function CreatorGridItem({ className, ...props }, ref) {
      return (
        <div ref={ref} {...props} className={cn("min-w-0 h-full", className)} />
      );
    },
  ),
};

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
    // stringArraysEqual(a.personaTags, b.personaTags) &&
    stringArraysEqual(a.restrictions, b.restrictions) &&
    stringArraysEqual(a.contentFormat, b.contentFormat) &&
    stringArraysEqual(a.appearance, b.appearance) &&
    stringArraysEqual(a.contentStyle, b.contentStyle) &&
    stringArraysEqual(a.capability, b.capability) &&
    stringArraysEqual(a.lifeStyle, b.lifeStyle) &&
    stringArraysEqual(a.occupation, b.occupation) &&
    stringArraysEqual(a.categoryExperience, b.categoryExperience) &&
    stringArraysEqual(a.canCreateWith, b.canCreateWith) &&
    stringArraysEqual(a.aiContentPermission, b.aiContentPermission) &&
    stringArraysEqual(a.language, b.language) &&
    a.ageGroup === b.ageGroup
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
  landingPage = false,
}: {
  initialData?: CreatorsListResult;
  landingPage?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user } = useAuth();
  const isBrand = !landingPage && (user?.roles?.includes("BRAND") ?? false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCreatorId, setDrawerCreatorId] = useState<string | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [wishlistCreator, setWishlistCreator] = useState<Creator | null>(null);

  const openDrawer = useCallback((creator: Creator) => {
    setSelectedCreator(creator);
    setDrawerCreatorId(creator.id);
    setDrawerOpen(true);
  }, []);

  const openWishlistModal = useCallback((creator: Creator) => {
    setWishlistCreator(creator);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);
  const searchParamsKey = searchParams.toString();

  const parsedInitial = useMemo(
    () => parseBrowseListingParams(searchParams),
    [searchParams],
  );

  const [filters, setFilters] = useState<Filters>(() => parsedInitial.filters);
  const [search, setSearch] = useState<string>(() => parsedInitial.search);

  const listingRef = useRef({ filters, search });

  useEffect(() => {
    listingRef.current = { filters, search };
  }, [filters, search]);

  const syncUrlImmediate = useCallback(
    (nextFilters: Filters, nextSearch: string) => {
      const qs = serializeBrowseListingParams(nextFilters, nextSearch);
      if (qs === searchParamsKey) return;
      const nextUrl = qs ? `?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", nextUrl);
    },
    [searchParamsKey],
  );

  const debouncedPushUrl = useDebouncedCallback(() => {
    const { filters: currentFilters, search: currentSearch } =
      listingRef.current;
    syncUrlImmediate(currentFilters, currentSearch);
  }, 500);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParamsKey);
    const parsed = parseBrowseListingParams(nextParams);

    if (nextParams.has("page")) {
      nextParams.delete("page");
      const qs = nextParams.toString();
      const nextUrl = qs ? `?${qs}` : window.location.pathname;
      window.history.replaceState(null, "", nextUrl);
    }

    startTransition(() => {
      setFilters((previous) =>
        filtersEqual(previous, parsed.filters) ? previous : parsed.filters,
      );
      setSearch((previous) =>
        previous === parsed.search ? previous : parsed.search,
      );
    });
  }, [router, searchParamsKey]);

  const listLimit = landingPage ? LANDING_PAGE_CREATOR_LIMIT : BROWSE_LIST_LIMIT;

  const apiFilters = useMemo(
    () => ({
      limit: listLimit,
      search: search.trim() || undefined,
      city: filters.city || undefined,
      categories: filters.categories,
      gender: filters.gender || undefined,
      industry: filters.industry || undefined,
      portfolioTag: filters.portfolioTag || undefined,
      onLocationAvailable: filters.onLocationAvailable || undefined,
      minPrice: filters.minPrice || undefined,
      maxPrice: filters.maxPrice || undefined,
      // personaTags: filters.personaTags,
      restrictions: filters.restrictions,
      contentFormat: filters.contentFormat.length
        ? filters.contentFormat
        : undefined,
      appearance: filters.appearance.length ? filters.appearance : undefined,
      contentStyle: filters.contentStyle.length
        ? filters.contentStyle
        : undefined,
      capability: filters.capability.length ? filters.capability : undefined,
      lifeStyle: filters.lifeStyle.length ? filters.lifeStyle : undefined,
      occupation: filters.occupation.length ? filters.occupation : undefined,
      categoryExperience: filters.categoryExperience.length
        ? filters.categoryExperience
        : undefined,
      canCreateWith: filters.canCreateWith.length
        ? filters.canCreateWith
        : undefined,
      aiContentPermission: filters.aiContentPermission.length
        ? filters.aiContentPermission
        : undefined,
      language: filters.language.length ? filters.language : undefined,
      ageGroup: filters.ageGroup || undefined,
    }),
    [filters, search, listLimit],
  );

  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCreatorsListQuery({
    filters: apiFilters,
    initialData:
      initialData &&
      initialData.page === 1 &&
      initialData.limit === listLimit &&
      filtersEqual(parsedInitial.filters, DEFAULT_FILTERS) &&
      parsedInitial.search === ""
        ? initialData
        : undefined,
  });

  const creators = useMemo(
    () => data?.pages.flatMap((pageData) => pageData.creators) ?? [],
    [data?.pages],
  );
  const visibleCreators = useMemo(
    () =>
      landingPage
        ? creators.slice(0, LANDING_PAGE_CREATOR_LIMIT)
        : creators,
    [creators, landingPage],
  );
  const { categoryOptions } = useMemo(
    () => deriveCreatorFilterOptions(creators),
    [creators],
  );

  const handleFiltersChange = useCallback(
    (next: Filters) => {
      listingRef.current.filters = next;
      setFilters(next);
      debouncedPushUrl();
    },
    [debouncedPushUrl],
  );

  const handleSearchChange = useCallback(
    (next: string) => {
      listingRef.current.search = next;
      setSearch(next);
      debouncedPushUrl();
    },
    [debouncedPushUrl],
  );

  const handleResetFilters = useCallback(() => {
    listingRef.current.filters = DEFAULT_FILTERS;
    listingRef.current.search = "";
    setFilters(DEFAULT_FILTERS);
    setSearch("");
    syncUrlImmediate(DEFAULT_FILTERS, "");
  }, [syncUrlImmediate]);

  const displayedCount = data?.pages.at(-1)?.total ?? 0;
  const loadedCount = creators.length;
  const showLandingLoadMore =
    landingPage &&
    (displayedCount > LANDING_PAGE_CREATOR_LIMIT ||
      loadedCount > LANDING_PAGE_CREATOR_LIMIT ||
      hasNextPage);

  const handleEndReached = useCallback(() => {
    if (landingPage || !hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, landingPage]);

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
    <div className="flex flex-1 w-full min-w-0 flex-col -mt-6">
      <CreatorFilterBar
        filters={filters}
        onChange={handleFiltersChange}
        search={search}
        onSearchChange={handleSearchChange}
        total={displayedCount}
        isPending={isPending && !data}
        onClear={handleResetFilters}
        categoryOptions={categoryOptions}
        landingPage={landingPage}
      />

      <div className="flex-1 bg-[#f4f4f5] -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 2xl:-mx-12 px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 -mb-8 pb-10 pt-6">
        {isPending && !data ? (
          <div
            className="grid w-full gap-x-5 gap-y-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
            aria-label="Loading creators"
          >
            {Array.from({ length: 10 }, (_, index) => (
              <div key={index} className="min-w-0 h-full">
                <CreatorCardSkeleton appearance="browse" />
              </div>
            ))}
          </div>
        ) : visibleCreators.length > 0 ? (
          <div className="flex flex-col gap-4">
            <VirtuosoGrid
              useWindowScroll
              totalCount={visibleCreators.length}
              components={virtuosoGridComponents}
              endReached={landingPage ? undefined : handleEndReached}
              increaseViewportBy={{ top: 800, bottom: 1200 }}
              computeItemKey={(index) =>
                visibleCreators[index]?.id
                  ? `${visibleCreators[index].id}-${index}`
                  : index
              }
              itemContent={(index) => {
                const creator = visibleCreators[index];
                if (!creator) return null;

                return (
                  <ReelCard
                    creator={creator}
                    index={index}
                    onOpen={openDrawer}
                    onWishlist={isBrand ? openWishlistModal : undefined}
                  />
                );
              }}
            />

            <div className="flex min-h-16 items-center justify-center pb-4 pt-2">
              {landingPage ? (
                showLandingLoadMore ? (
                  <Button asChild size="lg" className="min-w-[180px] rounded-xl mt-6">
                    <Link href="/register/brand">Load more</Link>
                  </Button>
                ) : null
              ) : isFetchingNextPage ? (
                <div
                  className="grid w-full gap-x-5 gap-y-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  aria-label="Loading more creators"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <CreatorCardSkeleton key={index} appearance="browse" />
                  ))}
                </div>
              ) : isError && data ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm font-medium text-foreground">
                    Could not load more creators
                  </p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    {error instanceof Error
                      ? error.message
                      : "Something went wrong."}
                  </p>
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    className="text-xs font-medium text-primary underline underline-offset-2"
                  >
                    Try again
                  </button>
                </div>
              ) : hasNextPage ? (
                <p className="text-xs text-muted-foreground">
                  Showing {loadedCount.toLocaleString()} of{" "}
                  {displayedCount.toLocaleString()} creators
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You&apos;ve reached the end
                </p>
              )}
            </div>
          </div>
        ) : (
          <EmptyBrowseState filters={filters} />
        )}
      </div>

      <ProfileDrawer
        creatorId={drawerCreatorId}
        open={drawerOpen}
        onClose={closeDrawer}
        creator={selectedCreator}
        landingPage={landingPage}
      />

      {wishlistCreator && (
        <SaveToWishlistModal
          open={!!wishlistCreator}
          onClose={() => setWishlistCreator(null)}
          creatorId={wishlistCreator.id}
          creatorName={wishlistCreator.name}
        />
      )}
    </div>
  );
}
