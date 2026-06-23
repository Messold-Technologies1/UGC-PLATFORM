"use client";

import { useState, type MouseEvent, useMemo } from "react";

import { ChevronRight } from "lucide-react";
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

import { useGetCreatorOrdersQuery } from "../../hooks/use-get-creator-orders-query";
import type { CreatorOrderListItem } from "../../api/get-creator-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "../../constants";
import { cn } from "@/lib/utils";
import { CreatorOrdersTabs, TAB_DEFINITIONS } from "./creator-orders-tabs";
import { CreatorOrdersFilters } from "./creator-orders-filters";
import { CreatorOrdersDetailsPanel } from "./creator-orders-details-panel";

export function CreatorOrdersList() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading } = useGetCreatorOrdersQuery({ page: 1, limit: 50 });

  const allItems = useMemo<CreatorOrderListItem[]>(
    () => data?.items ?? [],
    [data?.items],
  );

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return allItems;
    const tabDef = TAB_DEFINITIONS.find((t) => t.id === activeTab);
    if (!tabDef) return allItems;

    if (activeTab === "new") {
      return allItems.filter(
        (item) =>
          Boolean(item.order.hasBrief) &&
          tabDef.statuses.includes(item.order.status as string),
      );
    }

    return allItems.filter((item) =>
      tabDef.statuses.includes(item.order.status as string),
    );
  }, [allItems, activeTab]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedItems = filteredItems.slice((page - 1) * limit, page * limit);
  const displayItems = paginatedItems;

  const selectedItem = useMemo(() => {
    return allItems.find((item) => item.order.id === selectedOrderId);
  }, [allItems, selectedOrderId]);

  return (
    <div className="w-full mx-auto space-y-8 pb-4 pt-4 lg:pt-5">
      <CreatorOrdersTabs
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          setPage(1);
          setSelectedOrderId(null);
        }}
        allItems={allItems}
        totalCount={data?.total}
      />

      <div
        className={cn(
          "grid gap-6 items-start mt-4 transition-all duration-300",
          selectedOrderId
            ? activeTab !== "all"
              ? "lg:grid-cols-[320px_1fr] xl:grid-cols-[350px_1fr]"
              : "lg:grid-cols-[1fr_400px]"
            : "grid-cols-1",
        )}
      >
        <div className="space-y-6">
          <CreatorOrdersFilters
            activeTab={activeTab}
            isCompact={Boolean(selectedOrderId)}
          />

          <div
            className={cn(
              "space-y-3",
              selectedOrderId && activeTab !== "all" && "max-h-[calc(100vh-200px)] overflow-y-auto pr-1 scrollbar-thin"
            )}
          >
            {isLoading &&
              Array.from({ length: limit }).map((_, i) => (
                <div
                  key={i}
                  className="bg-background p-5 rounded-lg border border-border/40 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-6 w-full">
                    <div className="flex items-center space-x-4 flex-1">
                      <Skeleton className="h-12 w-12 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="hidden md:flex space-x-2 min-w-[200px]">
                      <Skeleton className="h-7 w-20 rounded-md" />
                    </div>
                    <div className="hidden lg:flex flex-col space-y-1.5 min-w-[150px]">
                      <Skeleton className="h-4 w-16 mb-0.5" />
                    </div>
                  </div>
                </div>
              ))}

            {!isLoading && displayItems.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground bg-background rounded-lg border border-border/40">
                <p className="text-sm font-medium text-foreground">
                  No orders yet
                </p>
              </div>
            )}

            {!isLoading &&
              displayItems.map(({ order, brand }) => {
                const isSelected = selectedOrderId === order.id;
                const isNarrowLayout = Boolean(
                  selectedOrderId &&
                  (activeTab === "new" ||
                    activeTab === "active" ||
                    activeTab === "revisions" ||
                    activeTab === "delivered" ||
                    activeTab === "completed" ||
                    activeTab === "cancelled"),
                );
                const displayId = `#${order.id.substring(0, 5).toUpperCase()}`;

                const categories = "Skincare • Product Demo";
                const isNew = order.status === "BRIEF_SUBMISSION_PENDING" || order.status === "BRIEF_SUBMITTED";
                const formattedDate = (dateString?: string | null) => {
                  if (!dateString) return "";
                  return new Intl.DateTimeFormat("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }).format(new Date(dateString));
                };

                let deliveryText = "ETA: To Be Determined";
                if (
                  order.status === "DELIVERED" ||
                  order.status === "COMPLETED"
                ) {
                  deliveryText = `${order.status === "DELIVERED" ? "Delivered" : "Completed"} on ${formattedDate(order.updatedAt) || "recently"}`;
                } else if (order.deliveryDeadlineAt) {
                  deliveryText = `ETA: ${formattedDate(order.deliveryDeadlineAt)}`;
                }

                return (
                  <div
                    key={order.id}
                    onClick={() =>
                      setSelectedOrderId(isSelected ? null : order.id)
                    }
                    className={cn(
                      "group relative overflow-hidden bg-background p-4 sm:p-5 rounded-lg flex items-start gap-4 transition-all duration-200 cursor-pointer shadow-sm border",
                      isSelected
                        ? "border-primary ring-1 ring-primary/20 shadow-md"
                        : "border-border/40 hover:border-border hover:shadow-md",
                    )}
                  >
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-border/40 bg-[#e8f5e9] text-[#2e7d32] shrink-0 mt-0.5">
                      <AvatarImage
                        src={brand.logoUrl || undefined}
                        className="object-cover rounded-lg"
                      />
                      <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                        {brand.brandName.substring(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <>
                      <div
                        className={cn(
                          "flex-1 items-center justify-between w-full gap-4",
                          isNarrowLayout ? "flex" : "flex lg:hidden",
                        )}
                      >
                        <div className="flex flex-col gap-2.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">
                              {displayId}
                            </span>
                            {isNew && !isNarrowLayout && (
                              <Badge
                                variant="secondary"
                                className="bg-[#4318FF]/10 text-[#4318FF] hover:bg-[#4318FF]/10 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border-0"
                              >
                                New Request
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm text-foreground/90 truncate">
                            {brand.brandName}
                          </h3>
                          <div className="flex flex-col gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground truncate">
                              {order.packageNameSnapshot || "UGC Video (60s)"}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "w-fit max-w-full rounded-md px-2 py-0.5 text-[10px] font-bold border-transparent",
                                STATUS_COLORS[order.status as string] ||
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              <span className="truncate">
                                {STATUS_LABELS[
                                  order.status as keyof typeof STATUS_LABELS
                                ] || order.status}
                              </span>
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-start">
                              <span className="font-bold text-sm text-foreground leading-none mb-1.5">
                                {order.priceAmountSnapshot &&
                                parseFloat(order.priceAmountSnapshot) > 0
                                  ? new Intl.NumberFormat("en-IN", {
                                      style: "currency",
                                      currency: "INR",
                                      maximumFractionDigits: 0,
                                    }).format(
                                      parseFloat(order.priceAmountSnapshot),
                                    )
                                  : "₹0"}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                Payout
                              </span>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-bold text-sm text-foreground leading-none mb-1.5">
                                {formattedDate(order.deliveryDeadlineAt) ||
                                  "TBD"}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-medium">
                                {order.status === "COMPLETED" ||
                                order.status === "DELIVERED"
                                  ? "Completed On"
                                  : "Due Date"}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0" />
                        </div>
                      </div>

                      {!isNarrowLayout && (
                        <div className="flex-1 hidden lg:flex items-center justify-between w-full ml-4">
                          <div className="flex flex-col gap-1.5 min-w-[160px] xl:min-w-[200px]">
                            <span className="font-bold text-sm text-foreground">
                              {displayId}
                            </span>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-foreground/90 truncate max-w-[120px] xl:max-w-[150px]">
                                {brand.brandName}
                              </h3>
                              {isNew && (
                                <Badge
                                  variant="secondary"
                                  className="bg-[#4318FF]/10 text-[#4318FF] hover:bg-[#4318FF]/10 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border-0 shrink-0"
                                >
                                  New Request
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5 min-w-[160px] xl:min-w-[200px]">
                            <span className="font-semibold text-sm text-foreground">
                              {order.packageNameSnapshot || "UGC Video (60s)"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {categories}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 min-w-[140px] xl:min-w-[180px] items-start">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "bg-[#4318FF]/10 text-[#4318FF] hover:bg-[#4318FF]/10 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border-0",
                                STATUS_COLORS[order.status as string] ||
                                  "bg-muted text-muted-foreground",
                              )}
                            >
                              {STATUS_LABELS[
                                order.status as keyof typeof STATUS_LABELS
                              ] || order.status}
                            </Badge>
                            <span className="text-[13px] text-muted-foreground font-medium">
                              {deliveryText}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5 min-w-[100px] items-start">
                            <span className="font-bold text-sm text-foreground leading-none">
                              {order.priceAmountSnapshot &&
                              parseFloat(order.priceAmountSnapshot) > 0
                                ? new Intl.NumberFormat("en-IN", {
                                    style: "currency",
                                    currency: "INR",
                                    maximumFractionDigits: 0,
                                  }).format(
                                    parseFloat(order.priceAmountSnapshot),
                                  )
                                : "₹0"}
                            </span>
                            <span className="text-[12px] text-muted-foreground font-medium">
                              Est. Payout
                            </span>
                          </div>

                          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0 ml-4" />
                        </div>
                      )}
                    </>
                  </div>
                );
              })}

            {(activeTab === "all" || !selectedOrderId) && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-6 mt-8 pb-4 w-full">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="text-sm text-muted-foreground">Page</span>
                    <span className="text-sm font-bold text-foreground">
                      {page}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      of {totalPages}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground italic border-l border-border/50 pl-2 hidden xl:inline-block whitespace-nowrap">
                    Showing{" "}
                    {paginatedItems.length === 0 ? 0 : (page - 1) * limit + 1}-
                    {Math.min(page * limit, total)} of {total} results
                  </span>
                </div>

                <div className="flex justify-center flex-1 min-w-[200px]">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={(e: MouseEvent) => {
                            e.preventDefault();
                            setPage((p) => Math.max(1, p - 1));
                          }}
                          className={cn(
                            page <= 1 &&
                              "pointer-events-none opacity-50 cursor-not-allowed",
                          )}
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
                          className={cn(
                            page >= totalPages &&
                              "pointer-events-none opacity-50 cursor-not-allowed",
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <span className="text-[11px] sm:text-xs text-muted-foreground font-bold uppercase tracking-wider whitespace-nowrap">
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
            )}
          </div>
        </div>

        {selectedOrderId && selectedItem && (
          <CreatorOrdersDetailsPanel
            selectedOrderId={selectedOrderId}
            selectedItem={selectedItem}
            activeTab={activeTab}
            onClose={() => setSelectedOrderId(null)}
            onTabChange={(tabId) => {
              setActiveTab(tabId);
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
