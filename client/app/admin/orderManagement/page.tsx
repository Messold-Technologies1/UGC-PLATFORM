"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import OrderRow from "@/components/admin/OrderRow";
import { OrderStatusTab } from "@/features/orders/components/brand-order-detail/order-status-tab";
import {
  ADMIN_STATUS_TAB_GROUPS,
  ADMIN_STATUS_TABS,
  tabCountsFromStatusCounts,
} from "@/features/orders/constants";
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
import { AdminCreatorListSearch } from "@/features/admin/components/admin-creator-list-search";
import { useAdminOrdersQuery } from "@/features/admin/hooks/use-admin-orders-query";

function OrderTableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b border-border/10">
          <td className="px-8 py-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-8 w-px" />
                <Skeleton className="h-10 w-10 rounded-md" />
              </div>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2 w-12" />
                </div>
                <Skeleton className="h-6 w-px" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-10" />
                </div>
              </div>
            </div>
          </td>
          <td className="px-8 py-6">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-24" />
          </td>
          <td className="px-8 py-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </td>
          <td className="px-8 py-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-16" />
          </td>
          <td className="px-8 py-6">
            <Skeleton className="h-6 w-28 rounded-full" />
          </td>
          <td className="px-8 py-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-2 w-16" />
          </td>
          <td className="px-8 py-6">
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function OrderManagement() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [gracePeriodCount, setGracePeriodCount] = useState(0);

  // Filter and paginate the list on the server. Tab badges use statusCounts /
  // gracePeriodCount, which are aggregates over every order (not this page).
  const isGraceTab = activeTab === "grace";
  const activeStatuses =
    isGraceTab || activeTab === "all"
      ? []
      : (ADMIN_STATUS_TAB_GROUPS[activeTab] ?? []);
  const trimmedSearch = search.trim();
  const { data, isLoading, isError, isFetching } = useAdminOrdersQuery({
    page,
    limit,
    statuses: activeStatuses.length > 0 ? activeStatuses.join(",") : undefined,
    inGracePeriod: isGraceTab ? true : undefined,
    search: trimmedSearch || undefined,
  });

  useEffect(() => {
    if (data?.statusCounts) setStatusCounts(data.statusCounts);
    if (typeof data?.gracePeriodCount === "number") {
      setGracePeriodCount(data.gracePeriodCount);
    }
  }, [data?.statusCounts, data?.gracePeriodCount]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  const tabCounts = useMemo(() => {
    const counts = tabCountsFromStatusCounts(
      statusCounts,
      ADMIN_STATUS_TABS,
      ADMIN_STATUS_TAB_GROUPS,
    );
    // Grace is a date window, not a status group — override from the API field.
    counts.grace = gracePeriodCount;
    return counts;
  }, [statusCounts, gracePeriodCount]);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setPage(1);
  }

  function handleSearchChange(next: string) {
    const wasSearching = trimmedSearch.length > 0;
    const isSearching = next.trim().length > 0;
    setSearch(next);
    // Page 3 of the old result set is rarely page 3 of the new one, and is
    // usually past its end — a search that lands on "no orders" when matches
    // exist reads as a broken search.
    setPage(1);
    // A search is meant to reach every stage. Started from inside a stage tab
    // it would otherwise answer out of that one stage, hiding the order the
    // admin is after behind a tab they have no reason to suspect. Only on the
    // way INTO a search, so a stage picked while already searching sticks.
    if (!wasSearching && isSearching) setActiveTab("all");
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showingStart = items.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  return (
    <div className="px-8 pb-8 pt-1 xl:px-10 xl:pb-10 2xl:px-12 2xl:pb-12 max-w-[1800px] mx-auto space-y-6 group selection-active">
      {/* Search sits ABOVE the tabs because it scopes them: the term reaches
          the status counts, so the row of badges under it is the answer to
          "which stage is this order in?" rather than a filter applied first. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {trimmedSearch
            ? `Searching every stage for “${trimmedSearch}” — the counts below show where the matches are.`
            : "Search every stage by brand, creator, agency, or order ID."}
        </p>
        <AdminCreatorListSearch
          value={search}
          onChange={handleSearchChange}
          isLoading={isFetching && !isLoading}
          placeholder="Search brand, creator, agency, or order ID…"
          className="relative w-full sm:w-[26rem]"
        />
      </div>

      <OrderStatusTab
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabCounts={tabCounts}
        tabs={ADMIN_STATUS_TABS}
      />

      <section className="bg-card dark:bg-card/10 border border-border/50 dark:border-border/10 rounded-3xl overflow-hidden glass-panel shadow-sm">
        <div className="px-8 py-6 bg-muted/50 dark:bg-card/20 border-b border-border/50 dark:border-border/10">
          <h3 className="font-headline font-bold text-xl text-foreground">
            Recent Transactions
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Creator and brand snapshots are loaded from the admin orders API.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left border-collapse">
            <thead className="bg-muted/50 dark:bg-card/30 text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-black">
              <tr>
                <th className="px-8 py-4">Creator & Brand</th>
                <th className="px-8 py-4">Package Details</th>
                <th className="px-8 py-4">Financials</th>
                <th className="px-8 py-4">Due Date</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Actioned By</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isLoading && <OrderTableSkeleton rows={limit} />}

              {!isLoading && isError && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-20 text-center text-sm text-muted-foreground"
                  >
                    We could not load the order list right now. Try again
                    shortly.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-8 py-20 text-center text-sm text-muted-foreground"
                  >
                    {trimmedSearch
                      ? `No orders match “${trimmedSearch}”${
                          activeTab === "all" ? "" : " in this stage"
                        }.`
                      : isGraceTab
                        ? "No orders are currently in their grace period."
                        : "No orders are available yet."}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                items.map((item, index) => (
                  <OrderRow
                    key={item.order.id}
                    order={item.order}
                    creator={item.creator}
                    brand={item.brand}
                    cancelledByActor={item.cancelledByActor}
                    briefAcceptedByActor={item.briefAcceptedByActor}
                    delay={index * 60}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col md:flex-row items-center justify-between border-t border-border/50 pt-8 mt-12 pb-20 gap-6">
        <div className="flex items-center justify-center md:justify-start space-x-4 min-w-[150px] w-full md:w-auto">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">Page</span>
            <span className="text-sm font-bold text-foreground">{page}</span>
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-bold border-l border-border uppercase tracking-widest whitespace-nowrap pl-4">
            Showing: {showingStart}-{showingEnd} of {total} results
          </span>
        </div>

        <div className="flex-1 flex justify-center w-full">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(event: MouseEvent) => {
                    event.preventDefault();
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
                        onClick={(event: MouseEvent) => {
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
                  onClick={(event: MouseEvent) => {
                    event.preventDefault();
                    setPage((current) => Math.min(totalPages, current + 1));
                  }}
                  disabled={page >= totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>

        <div className="flex items-center space-x-2 min-w-[150px] justify-center md:justify-end w-full md:w-auto">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
            Rows per page:
          </span>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[75px] h-8 bg-background/50 border border-border/50 hover:border-border font-bold text-xs focus:ring-1 focus:ring-primary/40 gap-1 px-2.5 transition-colors rounded-lg">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[75px]">
              <SelectItem
                value="5"
                className="text-xs font-bold cursor-pointer"
              >
                5
              </SelectItem>
              <SelectItem
                value="10"
                className="text-xs font-bold cursor-pointer"
              >
                10
              </SelectItem>
              <SelectItem
                value="20"
                className="text-xs font-bold cursor-pointer"
              >
                20
              </SelectItem>
              <SelectItem
                value="50"
                className="text-xs font-bold cursor-pointer"
              >
                50
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
