"use client";

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
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, Users, ChevronDown } from "lucide-react";
import { VirtuosoGrid } from "react-virtuoso";
import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { CreatorCard, CreatorCardSkeleton } from "./creator-card";
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

const BROWSE_LIST_LIMIT = 24;
const BRAND_CREATOR_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr7KglvvfKo8qFIxp2OdBVIrwuVS5qHkoG9kbVHXs1slOSSA/viewform?usp=header";

const virtuosoGridComponents = {
  List: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    function CreatorGridList({ className, ...props }, ref) {
      return (
        <div
          ref={ref}
          {...props}
          className={cn(
            "grid w-full gap-x-5 gap-y-4",
            "sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4",
            className,
          )}
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
    stringArraysEqual(a.interest, b.interest) &&
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
    const nextParams = new URLSearchParams(searchParamsKey);
    const parsed = parseBrowseListingParams(nextParams);

    if (nextParams.has("page")) {
      nextParams.delete("page");
      const qs = nextParams.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }

    startTransition(() => {
      setFilters((previous) =>
        filtersEqual(previous, parsed.filters) ? previous : parsed.filters,
      );
    });
  }, [router, searchParamsKey]);

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
      interest: filters.interest.length ? filters.interest : undefined,
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
    [filters],
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
      initialData.limit === BROWSE_LIST_LIMIT &&
      filtersEqual(parsedInitial.filters, DEFAULT_FILTERS)
        ? initialData
        : undefined,
  });

  const creators = useMemo(
    () => data?.pages.flatMap((pageData) => pageData.creators) ?? [],
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

  const activeTags = useMemo(() => {
    const tags: {
      id: string;
      label: string;
      type: keyof Filters;
      value?: string;
    }[] = [];
    if (filters.city)
      tags.push({
        id: `city-${filters.city}`,
        label: filters.city,
        type: "city",
      });
    if (filters.gender)
      tags.push({
        id: `gender-${filters.gender}`,
        label: filters.gender,
        type: "gender",
      });
    if (filters.ageGroup)
      tags.push({
        id: `age-${filters.ageGroup}`,
        label: filters.ageGroup
          .replace("AGE_", "")
          .replace("_", "–")
          .replace("PLUS", "+"),
        type: "ageGroup",
      });
    filters.categories.forEach((c) =>
      tags.push({ id: `cat-${c}`, label: c, type: "categories", value: c }),
    );
    // filters.personaTags.forEach(p => tags.push({ id: `persona-${p}`, label: p, type: "personaTags", value: p }));
    filters.contentFormat.forEach((v) =>
      tags.push({ id: `cf-${v}`, label: v, type: "contentFormat", value: v }),
    );
    filters.appearance.forEach((v) =>
      tags.push({ id: `ap-${v}`, label: v, type: "appearance", value: v }),
    );
    filters.contentStyle.forEach((v) =>
      tags.push({ id: `cs-${v}`, label: v, type: "contentStyle", value: v }),
    );
    filters.capability.forEach((v) =>
      tags.push({ id: `cap-${v}`, label: v, type: "capability", value: v }),
    );
    filters.lifeStyle.forEach((v) =>
      tags.push({ id: `ls-${v}`, label: v, type: "lifeStyle", value: v }),
    );
    filters.occupation.forEach((v) =>
      tags.push({ id: `occ-${v}`, label: v, type: "occupation", value: v }),
    );
    filters.interest.forEach((v) =>
      tags.push({ id: `int-${v}`, label: v, type: "interest", value: v }),
    );
    filters.categoryExperience.forEach((v) =>
      tags.push({
        id: `ce-${v}`,
        label: v,
        type: "categoryExperience",
        value: v,
      }),
    );
    filters.canCreateWith.forEach((v) =>
      tags.push({ id: `ccw-${v}`, label: v, type: "canCreateWith", value: v }),
    );
    filters.aiContentPermission.forEach((v) =>
      tags.push({
        id: `acp-${v}`,
        label: v,
        type: "aiContentPermission",
        value: v,
      }),
    );
    filters.language.forEach((v) =>
      tags.push({ id: `lang-${v}`, label: v, type: "language", value: v }),
    );
    return tags;
  }, [filters]);

  const handleFiltersChange = useCallback(
    (next: Filters) => {
      listingRef.current.filters = next;
      setFilters(next);
      debouncedPushUrl();
    },
    [debouncedPushUrl],
  );

  const handleRemoveTag = useCallback(
    (tag: {
      id: string;
      label: string;
      type: keyof Filters;
      value?: string;
    }) => {
      handleFiltersChange({
        ...filters,
        [tag.type]: Array.isArray(filters[tag.type])
          ? (filters[tag.type] as string[]).filter((v) => v !== tag.value)
          : typeof filters[tag.type] === "boolean"
            ? false
            : "",
      });
    },
    [filters, handleFiltersChange],
  );

  const handleResetFilters = useCallback(() => {
    listingRef.current.filters = DEFAULT_FILTERS;
    setFilters(DEFAULT_FILTERS);
    syncUrlImmediate(DEFAULT_FILTERS);
  }, [syncUrlImmediate]);

  const displayedCount = data?.pages.at(-1)?.total ?? 0;
  const loadedCount = creators.length;

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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
    <div className="flex w-full min-w-0 flex-col lg:flex-row lg:items-start gap-8 -mt-6">
      <div className="hidden lg:block w-full max-w-[260px] shrink-0 lg:sticky lg:top-20">
        <CreatorFilters
          filters={filters}
          onChange={handleFiltersChange}
          categoryOptions={categoryOptions}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* <div className="mb-6">
          <h1 className="text-[28px] font-bold text-[#111] tracking-tight">
            Find the right creator for your brand
          </h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">
            Browse creators by style, language, content type, location and more.
          </p>
        </div> */}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="relative w-full max-w-2xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search niche, style, language, city or keyword"
              value=""
              disabled
              aria-label="Creator search is currently unavailable"
              className="h-[46px] rounded-lg border-gray-200 py-2.5 pl-11 pr-12 text-[14px] shadow-sm bg-white disabled:opacity-100 disabled:bg-white placeholder:text-[#888] placeholder:font-normal text-gray-900"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <SlidersHorizontal className="size-[18px] text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[13px] text-[#6B7280] font-medium hidden sm:inline-block">
              Can&apos;t find the right fit?
            </span>
            <a
              href={BRAND_CREATOR_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[28px] items-center justify-center rounded-lg border border-primary px-2 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/10"
            >
              Request Help
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {activeTags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 rounded-md bg-[#F3EEFF] px-2.5 py-1 text-[13px] font-medium text-[#111]"
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="text-[#111] hover:text-gray-600 transition-colors"
                >
                  <svg
                    className="size-[10px] stroke-[2.5]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6L6 18M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            ))}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="ml-1 flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-1 text-[13px] font-medium text-primary transition-colors hover:bg-gray-50"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[13px] font-semibold text-[#6B7280]">
              {displayedCount.toLocaleString()} creators found
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#111]">
                Sort by: Recommended
              </span>
              <ChevronDown className="size-4 text-[#111]" />
            </div>
          </div>
        </div>

        <div className="pb-2">
          {creators.length > 0 ? (
            <div className="flex flex-col gap-4">
              <VirtuosoGrid
                useWindowScroll
                totalCount={creators.length}
                components={virtuosoGridComponents}
                endReached={handleEndReached}
                increaseViewportBy={{ top: 800, bottom: 1200 }}
                computeItemKey={(index) => creators[index]?.id ?? index}
                itemContent={(index) => {
                  const creator = creators[index];
                  if (!creator) return null;

                  return (
                    <CreatorCard
                      key={creator.id}
                      creator={creator}
                      variant="listing"
                      appearance="browse"
                    />
                  );
                }}
              />

              <div className="flex min-h-16 items-center justify-center pb-4 pt-2">
                {isFetchingNextPage ? (
                  <div
                    className="grid w-full gap-x-5 gap-y-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4"
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
      </div>
    </div>
  );
}
