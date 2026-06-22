"use client";

import { useState, useMemo, type MouseEvent } from "react";
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

import { useGetBrandOrdersQuery } from "../../hooks/use-get-brand-orders-query";
import {
  STATUS_TAB_GROUPS,
  STATUS_TABS,
  getStatusGroup,
} from "../../constants";

import { OrderStatusTab } from "./order-status-tab";
import { OrderCollaborationCard } from "./order-collaboration-card";
import { OrdersEmptyState } from "./orders-empty-state";

function CollaborationCardSkeleton() {
  return (
    <div className="grid grid-cols-[52px_minmax(0,1.7fr)_minmax(150px,0.9fr)_minmax(120px,auto)_auto] items-center gap-x-6 rounded-[14px] border border-border bg-card px-[22px] py-4 pl-[26px] shadow-sm">
      <Skeleton className="size-[52px] rounded-xl" />

      <div className="space-y-2.5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-36" />
      </div>

      <div className="hidden md:flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>

      <div className="hidden xl:flex flex-col items-end gap-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex flex-col items-end gap-2.5">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-9 w-20 rounded-[11px]" />
      </div>
    </div>
  );
}

export function BrandOrdersList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [activeTab, setActiveTab] = useState("all");

  const { data, isLoading } = useGetBrandOrdersQuery({ page, limit });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items = data?.items || [];

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const tab of STATUS_TABS) {
      if (tab.key === "all") {
        counts.all = items.length;
      } else {
        const statuses = STATUS_TAB_GROUPS[tab.key] ?? [];
        counts[tab.key] = items.filter(({ order }) =>
          statuses.includes(order.status),
        ).length;
      }
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    const statuses = STATUS_TAB_GROUPS[activeTab] ?? [];
    return items.filter(({ order }) => statuses.includes(order.status));
  }, [items, activeTab]);

  const hasActiveFilter = activeTab !== "all";

  return (
    <div id="brand-orders-page" className="px-6 py-10 pb-24">
      <OrderStatusTab
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        tabCounts={tabCounts}
      />

      <div className="flex flex-col gap-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <CollaborationCardSkeleton key={i} />
          ))}

        {!isLoading && filteredItems.length === 0 && (
          <OrdersEmptyState hasFilter={hasActiveFilter} />
        )}
        {!isLoading &&
          filteredItems.map(({ order, creator }, i) => (
            <OrderCollaborationCard
              key={order.id}
              order={order}
              creator={creator}
              index={i}
            />
          ))}
      </div>

      {!isLoading && items.length > 0 && (
        <div className="mt-12 flex items-center justify-between border-t border-border/50 pt-8">
          <div className="flex items-center gap-4 min-w-[150px]">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Page</span>
              <span className="text-sm font-bold text-foreground">{page}</span>
              <span className="text-sm text-muted-foreground">
                of {totalPages}
              </span>
            </div>
            <span className="hidden border-l border-border/50 pl-4 text-xs italic text-muted-foreground md:inline-block">
              Showing {items.length === 0 ? 0 : (page - 1) * limit + 1}-
              {Math.min(page * limit, total)} of {total} results
            </span>
          </div>

          <div className="flex flex-1 justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e: MouseEvent) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    disabled={page <= 1}
                  />
                </PaginationItem>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;

                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  ) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          href="#"
                          isActive={page === pageNum}
                          onClick={(e: MouseEvent) => {
                            e.preventDefault();
                            setPage(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }

                  if (pageNum === page - 2 || pageNum === page + 2) {
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return null;
                })}

                <PaginationItem>
                  <PaginationNext
                    onClick={(e: MouseEvent) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    disabled={page >= totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <div className="flex items-center gap-2 min-w-[150px] justify-end">
            <span className="whitespace-nowrap text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Rows per page:
            </span>
            <Select
              value={limit.toString()}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[75px] gap-1 rounded-lg border border-border/50 bg-background/50 px-2.5 text-xs font-bold transition-colors hover:border-border focus:ring-1 focus:ring-primary/40">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent align="end" className="min-w-[75px]">
                <SelectItem
                  value="15"
                  className="cursor-pointer text-xs font-bold"
                >
                  15
                </SelectItem>
                <SelectItem
                  value="30"
                  className="cursor-pointer text-xs font-bold"
                >
                  30
                </SelectItem>
                <SelectItem
                  value="50"
                  className="cursor-pointer text-xs font-bold"
                >
                  50
                </SelectItem>
                <SelectItem
                  value="100"
                  className="cursor-pointer text-xs font-bold"
                >
                  100
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
