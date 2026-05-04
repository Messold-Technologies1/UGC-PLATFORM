"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { ShoppingCart, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

import { useGetCreatorOrdersQuery } from "../hooks/use-get-creator-orders-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "../constants";

export function CreatorOrdersList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  const { data, isLoading } = useGetCreatorOrdersQuery({ page, limit });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items = data?.items || [];

  return (
    <div className="p-12 max-w-[1400px] mx-auto space-y-8 group selection-active">
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-headline font-extrabold text-5xl tracking-tight mb-2">
              Active Collaborations
            </h1>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4">
        {isLoading &&
          Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="glass-panel p-5 rounded-2xl border border-border/10 bg-card/10 flex items-center justify-between"
            >
              <div className="flex items-center space-x-6 w-full">
                <Skeleton className="h-5 w-5 rounded opacity-50" />
                <div className="flex items-center space-x-4 flex-1">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="hidden md:flex space-x-2 min-w-[200px]">
                  <Skeleton className="h-7 w-20 rounded-md" />
                  <Skeleton className="h-7 w-24 rounded-md" />
                </div>
                <div className="hidden lg:flex flex-col space-y-1.5 min-w-[150px]">
                  <Skeleton className="h-2 w-16 mb-0.5" />
                  <div className="flex -space-x-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
                <div className="flex items-center space-x-4 min-w-[120px] justify-end">
                  <Skeleton className="h-9 w-24 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        {!isLoading && items.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
              <ShoppingCart className="size-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">No orders yet</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              When brands place orders with you, they&apos;ll appear here so
              you can follow progress and manage delivery.
            </p>
          </div>
        )}
        {items.map(({ order, brand }, i) => (
          <div
            key={order.id}
            className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex items-center justify-between transition-all duration-300 hover:bg-accent/60 border-l-4 border-l-transparent hover:border-l-primary hover:shadow-lg hover:shadow-primary/5 reveal-item"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-full opacity-0 group-hover/item:opacity-100 blur transition-opacity duration-500"></div>
                <Avatar className="relative w-14 h-14 rounded-full border-2 border-border">
                  <AvatarImage
                    src={brand.logoUrl || undefined}
                    alt={brand.brandName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {brand.brandName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div>
                <h3 className="font-headline font-bold text-lg mb-0.5">
                  {brand.brandName}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 bg-primary-container/20 text-primary rounded-md border border-primary/20 uppercase tracking-wider truncate max-w-[150px]">
                    {order.packageNameSnapshot}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-10">
              <div className="hidden xl:block min-w-[120px]">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                  Amount
                </p>
                <p className="font-bold text-base">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: order.currency || "USD",
                  }).format(
                    parseFloat(order.priceAmountSnapshot as string),
                  )}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {order.deliveryDaysSnapshot || 0} days
                  </span>
                </p>
              </div>

              <div className="hidden xl:block min-w-[100px]">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest mb-0.5">
                  Status
                </p>
                <Badge
                  variant="outline"
                  className={`${STATUS_COLORS[order.status as keyof typeof STATUS_COLORS] || "bg-muted text-muted-foreground"} rounded-md px-2.5 py-0.5 text-xs font-semibold`}
                >
                  {STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] ||
                    order.status}
                </Badge>
              </div>

              <div className="flex items-center space-x-3 sm:space-x-4 ml-4 shrink-0">
                <Link
                  href={`/creator/orders/${order.id}`}
                  className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 transition-colors whitespace-nowrap"
                >
                  View Details
                </Link>
                <Link
                  href={`/creator/orders/${order.id}`}
                  className="flex items-center justify-center size-10 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shrink-0 group-hover/item:bg-primary group-hover/item:text-primary-foreground"
                >
                  <ChevronRight className="size-5 transition-transform group-hover/item:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border/50 pt-8 mt-12 pb-20">
        <div className="flex items-center space-x-4 min-w-[150px]">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground">Page</span>
            <span className="text-sm font-bold text-foreground">{page}</span>
            <span className="text-sm text-muted-foreground">
              of {totalPages}
            </span>
          </div>
          <span className="text-xs text-muted-foreground italic border-l border-border/50 pl-4 hidden md:inline-block">
            Showing {items.length === 0 ? 0 : (page - 1) * limit + 1}-
            {Math.min(page * limit, total)} of {total} results
          </span>
        </div>

        <div className="flex-1 flex justify-center">
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

        <div className="flex items-center space-x-2 min-w-[150px] justify-end">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
            Rows per page:
          </span>
          <Select
            value={limit.toString()}
            onValueChange={(v) => {
              setLimit(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[75px] h-8 bg-background/50 border border-border/50 hover:border-border font-bold text-xs focus:ring-1 focus:ring-primary/40 gap-1 px-2.5 transition-colors rounded-lg">
              <SelectValue placeholder={limit.toString()} />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-[75px]">
              <SelectItem
                value="6"
                className="text-xs font-bold cursor-pointer"
              >
                6
              </SelectItem>
              <SelectItem
                value="15"
                className="text-xs font-bold cursor-pointer"
              >
                15
              </SelectItem>
              <SelectItem
                value="30"
                className="text-xs font-bold cursor-pointer"
              >
                30
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

