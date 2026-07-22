"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReviewDrawer from "@/components/admin/ReviewDrawer";
import { AdminCreatorListRow } from "@/features/admin/components/admin-creator-list-row";
import { AdminCreatorListSearch } from "@/features/admin/components/admin-creator-list-search";
import { AdminCreatorSegmentTabs } from "@/features/admin/components/admin-creator-segment-tabs";
import { AdminBuildingProfileAnalytics } from "@/features/admin/components/admin-building-profile-analytics";
import {
  getAdminCreatorEmptyMessage,
  getAdminCreatorTabs,
  isAdminCreatorListSegment,
} from "@/features/admin/constants/admin-creator-tabs";
import { useAdminCreatorsQuery } from "@/features/admin/hooks/use-admin-creators-query";
import { useAdminCreatorSegmentCountsQuery } from "@/features/admin/hooks/use-admin-creator-segment-counts-query";
import type {
  AdminCreatorListItemDto,
  AdminCreatorListSegment,
} from "@/features/admin/types";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const DEFAULT_TAB: AdminCreatorListSegment =
  getAdminCreatorTabs()[0]?.value ?? "pending";

function AdminCreatorsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const viewParam = searchParams.get("view");
  const analyticsActive = viewParam === "analytics";
  const highlightedCreatorId = searchParams.get("highlightedCreatorId");

  const [segment, setSegment] = useState<AdminCreatorListSegment>(
    isAdminCreatorListSegment(tabParam) ? tabParam : DEFAULT_TAB,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [selectedCreator, setSelectedCreator] =
    useState<AdminCreatorListItemDto | null>(null);

  useEffect(() => {
    if (isAdminCreatorListSegment(tabParam) && tabParam !== segment) {
      setSegment(tabParam);
      setPage(1);
    }
  }, [tabParam, segment]);

  const { data: counts, isLoading: countsLoading } =
    useAdminCreatorSegmentCountsQuery();
  const { data, isLoading, isFetching, isError } = useAdminCreatorsQuery({
    segment,
    page,
    limit,
    search: search.trim() || undefined,
  });

  const creators = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const searchLoading = isFetching && !isLoading;
  const showingStart = creators.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);
  const activeTabMeta = getAdminCreatorTabs().find((tab) => tab.value === segment);

  const handleTabChange = (next: AdminCreatorListSegment) => {
    setSegment(next);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    params.delete("view");
    params.delete("highlightedCreatorId");
    router.replace(`/admin/creators?${params.toString()}`);
  };

  const handleSelectAnalytics = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "analytics");
    params.delete("highlightedCreatorId");
    router.replace(`/admin/creators?${params.toString()}`);
  };

  return (
    <>
      <div className="space-y-8 p-8">
     

        <AdminCreatorSegmentTabs
          value={segment}
          counts={counts}
          countsLoading={countsLoading}
          onChange={handleTabChange}
          analyticsActive={analyticsActive}
          onSelectAnalytics={handleSelectAnalytics}
          trailing={
            analyticsActive ? null : (
              <AdminCreatorListSearch
                value={search}
                isLoading={searchLoading}
                onChange={(next) => {
                  setSearch(next);
                  setPage(1);
                }}
                className="relative w-full sm:w-64"
              />
            )
          }
        />

        {analyticsActive ? (
          <AdminBuildingProfileAnalytics enabled={analyticsActive} />
        ) : isError && !isLoading ? (
          <div className="rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground glass-panel">
            We could not load creators right now. Try again shortly.
          </div>
        ) : (
          <>
            <div className="relative grid grid-cols-1 gap-4">
              {searchLoading ? (
                <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-background/40 backdrop-blur-[1px]" />
              ) : null}

              {isLoading
                ? Array.from({ length: limit }).map((_, index) => (
                    <div
                      key={`creator-skeleton-${index}`}
                      className="glass-panel flex items-center gap-4 rounded-2xl border border-border/10 bg-card/10 p-5"
                    >
                      <Skeleton className="h-14 w-14 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-72" />
                      </div>
                    </div>
                  ))
                : null}

              {!isLoading && creators.length === 0 ? (
                <div className="rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground glass-panel">
                  {getAdminCreatorEmptyMessage(segment, Boolean(search.trim()))}
                </div>
              ) : null}

              {!isLoading
                ? creators.map((creator) => (
                    <div
                      key={creator.id}
                      id={`creator-${creator.id}`}
                      className={
                        creator.id === highlightedCreatorId
                          ? "rounded-2xl ring-2 ring-primary/40"
                          : undefined
                      }
                    >
                      <AdminCreatorListRow
                        creator={creator}
                        segment={segment}
                        onReview={() => setSelectedCreator(creator)}
                      />
                    </div>
                  ))
                : null}
            </div>

            <div className="flex flex-col items-center justify-between gap-6 border-t border-border/50 pt-8 md:flex-row">
              <div className="flex min-w-[150px] items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <span className="text-sm font-bold text-foreground">{page}</span>
                  <span className="text-sm text-muted-foreground">
                    of {totalPages}
                  </span>
                </div>
                <span className="whitespace-nowrap border-l border-border pl-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Showing: {showingStart}-{showingEnd} of {total}{" "}
                  {activeTabMeta?.label.toLowerCase() ?? "results"}
                </span>
              </div>

              <div className="flex flex-1 justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        type="button"
                        onClick={() => {
                          setPage((current) => Math.max(1, current - 1));
                        }}
                        disabled={page <= 1}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= page - 1 && pageNumber <= page + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              href="#"
                              isActive={page === pageNumber}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(pageNumber);
                              }}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      }
                      if (pageNumber === page - 2 || pageNumber === page + 2) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}

                    <PaginationItem>
                      <PaginationNext
                        type="button"
                        onClick={() => {
                          setPage((current) => Math.min(totalPages, current + 1));
                        }}
                        disabled={page >= totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>

              <div className="flex min-w-[150px] items-center justify-end space-x-2">
                <span className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Rows per page:
                </span>
                <Select
                  value={limit.toString()}
                  onValueChange={(value) => {
                    setLimit(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[75px] gap-1 rounded-lg border border-border/50 bg-background/50 px-2.5 text-xs font-bold transition-colors hover:border-border focus:ring-1 focus:ring-primary/40">
                    <SelectValue placeholder={limit.toString()} />
                  </SelectTrigger>
                  <SelectContent align="end" className="min-w-[75px]">
                    {[10, 20, 30, 50].map((value) => (
                      <SelectItem
                        key={value}
                        value={String(value)}
                        className="cursor-pointer text-xs font-bold"
                      >
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>

      <ReviewDrawer
        isOpen={!!selectedCreator}
        onClose={() => setSelectedCreator(null)}
        creator={selectedCreator}
      />
    </>
  );
}

export default function AdminCreatorsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 p-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`page-skeleton-${index}`} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <AdminCreatorsPageInner />
    </Suspense>
  );
}
