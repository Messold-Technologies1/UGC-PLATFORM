"use client";

import { useState, type MouseEvent } from "react";
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
            <Skeleton className="h-6 w-28 rounded-full" />
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

  const { data, isLoading, isError } = useAdminOrdersQuery({ page, limit });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showingStart = items.length === 0 ? 0 : (page - 1) * limit + 1;
  const showingEnd = Math.min(page * limit, total);

  return (
    <div className="p-12 max-w-[1400px] mx-auto space-y-8 group selection-active">
      <section className="mb-12">
        <h2 className="font-headline text-5xl font-extrabold tracking-tight mb-2">
          Order Management
        </h2>
        <p className="text-muted-foreground text-sm max-w-2xl">
          Monitor and control all platform transactions. Use the detailed view
          to audit individual deliverables and payment statuses.
        </p>
      </section>

      <section className="bg-card dark:bg-card/10 border border-border/50 dark:border-border/10 rounded-3xl overflow-hidden glass-panel shadow-sm">
        <div className="px-8 py-6 flex items-center justify-between bg-muted/50 dark:bg-card/20 border-b border-border/50 dark:border-border/10">
          <div>
            <h3 className="font-headline font-bold text-xl text-foreground">
              Recent Transactions
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Creator and brand snapshots are loaded from the admin orders API.
            </p>
          </div>
        </div>

        <div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-muted/50 dark:bg-card/30 text-[11px] text-muted-foreground uppercase tracking-[0.15em] font-black">
              <tr>
                <th className="px-8 py-4">Creator & Brand</th>
                <th className="px-8 py-4">Package Details</th>
                <th className="px-8 py-4">Financials</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {isLoading && <OrderTableSkeleton rows={limit} />}

              {!isLoading && isError && (
                <tr>
                  <td
                    colSpan={5}
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
                    colSpan={5}
                    className="px-8 py-20 text-center text-sm text-muted-foreground"
                  >
                    No orders are available yet.
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
                    delay={index * 60}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="flex items-center justify-between border-t border-border/50 dark:border-border/10 px-8 py-6 bg-muted/30 dark:bg-card/20">
        <div className="flex items-center space-x-4 min-w-[150px]">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">Page</span>
            <span className="text-sm font-bold text-foreground">{page}</span>
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
          </div>
          <span className="text-xs text-muted-foreground font-bold border-l border-border uppercase tracking-widest whitespace-nowrap">
            Showing: {showingStart}-{showingEnd} of {total} results
          </span>
        </div>

        <div className="flex-1">
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

        <div className="flex items-center space-x-2 min-w-[150px] justify-end">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
            Rows Per Page:
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
