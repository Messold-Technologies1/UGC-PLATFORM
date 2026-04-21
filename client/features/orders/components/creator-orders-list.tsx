"use client";

import { useMemo, useState, type MouseEvent } from "react";
// import Image from "next/image";
import Link from "next/link";
import { Clock3, Package, ShoppingCart, Wallet, ChevronRight } from "lucide-react";

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

import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCreatorOrdersQuery } from "../hooks/use-get-creator-orders-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "../constants";

export function CreatorOrdersList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);

  const { data, isLoading } = useGetCreatorOrdersQuery({ page, limit });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const stats = useMemo(() => {
    let activeOrders = 0;
    let pendingDelivery = 0;
    let completed = 0;
    let totalEarnings = 0;

    const items = data?.items || [];
    items.forEach(({ order }) => {
      if (
        [
          "BRIEF_SUBMISSION_PENDING",
          "BRIEF_SUBMITTED",
          "DELIVERED",
          "REVISION_REQUESTED",
          "REVISION_SUBMITTED",
          "DISPUTED",
        ].includes(order.status)
      ) {
        activeOrders++;
      }

      if (["BRIEF_SUBMITTED", "REVISION_REQUESTED"].includes(order.status)) {
        pendingDelivery++;
      }

      if (["ACCEPTED", "CREATOR_PAYMENT_DONE"].includes(order.status)) {
        completed++;
      }

      if (!["PENDING_PAYMENT", "REJECTED"].includes(order.status)) {
        const amount = parseFloat(order.priceAmountSnapshot) || 0;
        totalEarnings += amount;
      }
    });

    return [
      { label: "Active Orders", value: activeOrders.toString(), icon: ShoppingCart },
      { label: "Pending Delivery", value: pendingDelivery.toString(), icon: Clock3 },
      { label: "Completed", value: completed.toString(), icon: Package },
      { 
        label: "Total Earnings", 
        value: `$${totalEarnings.toFixed(2)}`, 
        icon: Wallet 
      },
    ];
  }, [data]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Orders"
        description="Track your creator collaborations, delivery status, and payouts."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-8 space-y-6 w-full">
        <h2 className="text-xl font-bold font-headline">Order activity</h2>
        <div className="w-full">
          {isLoading ? (
            <div className="flex flex-col space-y-4 w-full">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full"
                >
                  <div className="flex items-center gap-6 min-w-[250px] w-full xl:w-auto">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <div className="min-w-0 space-y-2">
                       <Skeleton className="h-5 w-32" />
                       <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 w-full pl-0 xl:pl-8">
                    <div className="flex flex-col space-y-2.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <div className="flex flex-col space-y-2.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </div>
                    <div className="flex flex-col space-y-2.5">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-6 shrink-0 w-full xl:w-auto mt-4 xl:mt-0">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 w-full text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10">
                <ShoppingCart className="size-5 text-primary" />
              </div>
              <p className="text-sm font-medium">No orders yet</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                When brands place orders with you, they&apos;ll appear here so you
                can follow progress and manage delivery.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col space-y-4 w-full">
                {data.items.map(({ order, brand }) => (
                  <div
                    key={order.id}
                    className="group/item relative overflow-hidden glass-panel p-4 rounded-2xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 w-full transition-all duration-300 hover:bg-accent/60 hover:shadow-lg hover:shadow-primary/5"
                  >
                    <div className="flex items-center gap-6 min-w-[250px] w-full xl:w-auto">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-linear-to-tr from-primary to-secondary rounded-full opacity-0 group-hover/item:opacity-100 blur transition-opacity duration-500"></div>
                        <Avatar className="relative h-14 w-14 border-2 border-border bg-muted z-10 shrink-0">
                          <AvatarImage src={brand.logoUrl || undefined} className="object-cover" />
                          <AvatarFallback>
                            {brand.companyName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-headline font-bold text-lg mb-0.5 group-hover/item:text-primary transition-colors">
                          {brand.companyName}
                        </h3>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-6 w-full pl-0 xl:pl-8">
                       <div className="flex flex-col">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Package</p>
                         <p className="font-bold text-sm truncate text-foreground/90">{order.packageNameSnapshot}</p>
                         <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">ID: {order.id.split("-").pop() || order.id.substring(0, 8)}</p>
                       </div>
                       <div className="flex flex-col">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Status</p>
                         <Badge
                           variant="outline"
                           className={`${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"} w-fit rounded-md px-2.5 py-0.5 text-xs font-semibold`}
                         >
                           {STATUS_LABELS[order.status] || order.status}
                         </Badge>
                       </div>
                       <div className="flex flex-col">
                         <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-medium">Amount</p>
                         <p className="font-bold text-sm text-foreground/90">
                           {new Intl.NumberFormat("en-US", {
                             style: "currency",
                             currency: order.currency || "USD",
                           }).format(parseFloat(order.priceAmountSnapshot))}
                         </p>
                         <p className="text-xs text-muted-foreground mt-0.5">{order.deliveryDaysSnapshot || 0} days delivery</p>
                       </div>
                    </div>

                    <div className="flex items-center justify-end gap-6 shrink-0 w-full xl:w-auto mt-4 xl:mt-0">
                      <Link 
                        href={`/creator/orders/${order.id}`}
                        className="flex items-center size-10 justify-center rounded-full bg-primary/5 text-primary opacity-80 hover:bg-primary hover:text-primary-foreground group-hover/item:bg-primary group-hover/item:text-primary-foreground group-hover/item:opacity-100 transition-all cursor-pointer"
                      >
                        <ChevronRight className="size-5 transition-transform group-hover/item:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between p-2 mt-4 gap-6">
                <div className="flex items-center justify-center md:justify-start space-x-4 min-w-[150px] w-full md:w-auto">
                  <div className="flex items-center space-x-1">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="text-sm font-bold text-foreground">{page}</span>
                    <span className="text-sm text-muted-foreground">
                      of {totalPages}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground italic border-l border-border/50 pl-4 hidden md:inline-block">
                    Showing {data.items.length === 0 ? 0 : (page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total} results
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
                      <SelectItem value="6" className="text-xs font-bold cursor-pointer">6</SelectItem>
                      <SelectItem value="10" className="text-xs font-bold cursor-pointer">10</SelectItem>
                      <SelectItem value="20" className="text-xs font-bold cursor-pointer">20</SelectItem>
                      <SelectItem value="30" className="text-xs font-bold cursor-pointer">30</SelectItem>
                      <SelectItem value="50" className="text-xs font-bold cursor-pointer">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
