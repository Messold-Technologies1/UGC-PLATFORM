"use client";

import { Suspense, useState, useMemo, useEffect, type MouseEvent } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import OrderRow from "@/components/admin/OrderRow";
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
import { useAdminOrdersQuery } from "@/features/admin/hooks/use-admin-orders-query";
import {
  AdminOrdersTabs,
  ADMIN_ORDER_TABS,
  isAdminOrderTab,
  filterItemsByTab,
  type AdminOrderTabKey,
} from "@/features/admin/components/admin-orders-tabs";

function OrderTableSkeleton({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b border-border/10">
          <td className="px-4 sm:px-8 py-6">
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
          <td className="px-4 sm:px-8 py-6">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-24" />
          </td>
          <td className="px-4 sm:px-8 py-6 hidden md:table-cell">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </td>
          <td className="px-4 sm:px-8 py-6 hidden sm:table-cell">
            <Skeleton className="h-6 w-28 rounded-full" />
          </td>
          <td className="px-4 sm:px-8 py-6">
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function OrderManagementInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab");
  const activeTab: AdminOrderTabKey = isAdminOrderTab(tabParam)
    ? tabParam
    : "all";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  function handleTabChange(tab: AdminOrderTabKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const { data, isLoading, isError } = useAdminOrdersQuery({
    page: 1,
    limit: 50,
  });

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);

  const filteredItems = useMemo(
    () => filterItemsByTab(allItems, activeTab),
    [allItems, activeTab],
  );

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedItems = filteredItems.slice((page - 1) * limit, page * limit);
  const showingStart = paginatedItems.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  const activeTabLabel = useMemo(() => {
    const tab = ADMIN_ORDER_TABS.find((t) => t.key === activeTab);
    return tab?.label ?? "All";
  }, [activeTab]);

  return (
    <div className="px-4 sm:px-6 md:px-12 pt-2 sm:pt-4 md:pt-6 pb-12 w-full space-y-4 sm:space-y-6 md:space-y-8 group selection-active">
      <AdminOrdersTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        allItems={allItems}
        totalCount={data?.total}
      />

      <section className="bg-card dark:bg-card/10 border border-border/50 dark:border-border/10 rounded-2xl sm:rounded-3xl overflow-hidden glass-panel shadow-sm">
        <div className="px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 dark:bg-card/20 border-b border-border/50 dark:border-border/10 gap-2">
          <div>
            <h3 className="font-headline font-bold text-lg sm:text-xl text-foreground">
              {activeTab === "all" ? "All Orders" : activeTabLabel}
            </h3>
            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted-foreground">
              {activeTab === "all"
                ? "Showing all orders across every status."
                : `Filtered to orders in the "${activeTabLabel}" stage.`}
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground tabular-nums whitespace-nowrap">
            {total} {total === 1 ? "order" : "orders"}
          </span>
        </div>

        <div
          className={cn(
            "overflow-x-auto",
            limit > 5 && "max-h-[600px] overflow-y-auto custom-scrollbar"
          )}
        >
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="sticky top-0 z-10 bg-muted dark:bg-card/95 text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-black shadow-sm backdrop-blur-sm">
              <tr>
                <th className="px-4 sm:px-8 py-4">Creator & Brand</th>
                <th className="px-4 sm:px-8 py-4">Package Details</th>
                <th className="px-4 sm:px-8 py-4 hidden md:table-cell">
                  Financials
                </th>
                <th className="px-4 sm:px-8 py-4 hidden sm:table-cell">
                  Status
                </th>
                <th className="px-4 sm:px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isLoading && <OrderTableSkeleton rows={limit} />}

              {!isLoading && isError && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 sm:px-8 py-20 text-center text-sm text-muted-foreground"
                  >
                    We could not load the order list right now. Try again
                    shortly.
                  </td>
                </tr>
              )}

              {!isLoading && !isError && paginatedItems.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 sm:px-8 py-20 text-center text-sm text-muted-foreground"
                  >
                    {activeTab === "all"
                      ? "No orders are available yet."
                      : `No orders in the "${activeTabLabel}" category.`}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                paginatedItems.map((item, index) => (
                  <OrderRow
                    key={item.order.id}
                    order={item.order}
                    creator={item.creator}
                    brand={item.brand}
                    delay={index * 60}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col md:flex-row items-center justify-between border-t border-border/50 pt-6 sm:pt-8 mt-8 sm:mt-12 pb-12 sm:pb-20 gap-4 sm:gap-6">
        <div className="flex items-center justify-center md:justify-start space-x-4 min-w-[150px] w-full md:w-auto">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">Page</span>
            <span className="text-sm font-bold text-foreground">{page}</span>
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-bold border-l border-border uppercase tracking-widest whitespace-nowrap pl-4 hidden sm:inline">
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

export default function OrderManagement() {
  return (
    <Suspense
      fallback={
        <div className="px-4 sm:px-6 md:px-12 pt-2 sm:pt-4 md:pt-6 pb-12 w-full space-y-6">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="bg-card border border-border/50 rounded-2xl sm:rounded-3xl overflow-hidden">
            <div className="px-4 sm:px-8 py-4 sm:py-6 bg-muted/50 border-b border-border/50">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-3 w-64" />
            </div>
            <div className="divide-y divide-border/10">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="px-4 sm:px-8 py-6 flex items-center gap-4"
                >
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <OrderManagementInner />
    </Suspense>
  );
}
