"use client";

import { Suspense, useEffect, useState, type MouseEvent, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

import { useGetCreatorOrdersQuery } from "../../hooks/use-get-creator-orders-query";
import type { CreatorOrderListItem } from "../../api/get-creator-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "../../constants";
import { getDeliveryDeadlineCardMeta } from "../delivery-deadline-display";
import { cn } from "@/lib/utils";
import {
  CreatorOrdersTabs,
  TAB_DEFINITIONS,
  isCreatorOrdersTab,
  getCreatorOrdersTabForStatus,
} from "./creator-orders-tabs";
import { CreatorOrdersDetailsPanel } from "./creator-orders-details-panel";

function CreatorOrdersListInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = isCreatorOrdersTab(tabParam) ? tabParam : "all";

  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get("orderId");
    if (orderIdParam) {
      setSelectedOrderId(orderIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  function handleTabChange(tabId: string, selectOrderId?: string) {
    setPage(1);
    setSelectedOrderId(selectOrderId ?? null);

    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const { data, isLoading } = useGetCreatorOrdersQuery({ page: 1, limit: 50 });

  const allItems = useMemo<CreatorOrderListItem[]>(
    () => data?.items ?? [],
    [data?.items],
  );

  useEffect(() => {
    if (!selectedOrderId) return;

    const orderIdParam = searchParams.get("orderId");
    if (activeTab === "all" && !orderIdParam) return;

    const order = allItems.find((item) => item.order.id === selectedOrderId);
    if (!order) return;

    const correctTab = getCreatorOrdersTabForStatus(order.order.status as string);
    const tabMismatch =
      correctTab !== "all" && correctTab !== activeTab;

    if (!tabMismatch && !orderIdParam) return;

    const params = new URLSearchParams(searchParams.toString());
    params.delete("orderId");
    if (correctTab !== "all") {
      params.set("tab", correctTab);
    } else if (tabMismatch) {
      params.delete("tab");
    }

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentQs = searchParams.toString();
    const currentUrl = currentQs ? `${pathname}?${currentQs}` : pathname;
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [
    selectedOrderId,
    allItems,
    activeTab,
    searchParams,
    pathname,
    router,
  ]);

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
        onTabChange={handleTabChange}
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

            {!isLoading && displayItems.map(({ order, brand }) => {
                const isSelected = selectedOrderId === order.id;
                const isNarrowLayout = Boolean(
                  isDesktop &&
                  selectedOrderId &&
                  (activeTab === "new" ||
                    activeTab === "active" ||
                    activeTab === "revisions" ||
                    activeTab === "delivered" ||
                    activeTab === "completed" ||
                    activeTab === "dispute" ||
                    activeTab === "cancelled"),
                );
                const displayId = `#${order.id.substring(0, 5).toUpperCase()}`;
                const deadlineMeta = getDeliveryDeadlineCardMeta(order);

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

                let badgeLabel = STATUS_LABELS[order.status as keyof typeof STATUS_LABELS] || order.status;
                let badgeColor = STATUS_COLORS[order.status as string] || "bg-muted text-muted-foreground";

                if (
                  order.requiresPhysicalProductShipment &&
                  (order.status === "BRIEF_ACCEPTED" || order.status === "PRODUCT_SHIPPED")
                ) {
                  badgeLabel = "Awaiting Shipment";
                  badgeColor = "bg-amber-500/10 text-amber-600 border-amber-500/20";
                }

                let deliveryText = "ETA: To Be Determined";
                if (
                  order.status === "DELIVERED" ||
                  order.status === "COMPLETED" ||
                  order.status === "REVISION_SUBMITTED" ||
                  order.status === "REVISION_REQUESTED"
                ) {
                  const prefix = order.status === "COMPLETED" ? "Completed" : "Delivered";
                  deliveryText = `${prefix} on ${formattedDate(order.updatedAt) || "recently"}`;
                } else if (order.deliveryDueAt || order.deliveryDaysSnapshot) {
                  if (deadlineMeta.label === "Grace ends") {
                    deliveryText = `Grace ends ${deadlineMeta.value}`;
                  } else if (deadlineMeta.value === "Overdue") {
                    deliveryText = "Overdue";
                  } else {
                    deliveryText = `ETA: ${deadlineMeta.value}`;
                  }
                }

                return (
                  <div
                    key={order.id}
                    onClick={() =>
                      setSelectedOrderId(isSelected ? null : order.id)
                    }
                    className={cn(
                      "group relative bg-background p-4 sm:p-5 rounded-lg flex items-start gap-3 sm:gap-4 transition-all duration-200 cursor-pointer shadow-sm border",
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
                          "flex-1 min-w-0 w-full",
                          isNarrowLayout ? "flex flex-col gap-2.5" : "flex md:hidden flex-col gap-2.5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="flex flex-col gap-2 min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-sm text-foreground shrink-0">
                                {displayId}
                              </span>
                              {isNew && !isNarrowLayout && (
                                <Badge
                                  variant="secondary"
                                  className="bg-[#4318FF]/10 text-[#4318FF] hover:bg-[#4318FF]/10 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border-0 shrink-0"
                                >
                                  New Request
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold text-sm text-foreground/90 truncate min-w-0">
                                {brand.brandName}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border-transparent",
                                  badgeColor,
                                )}
                              >
                                {badgeLabel}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground truncate">
                              {order.packageNameSnapshot || "UGC Video (60s)"}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-2.5">
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-sm text-foreground leading-snug">
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
                          <div className="flex flex-col items-end text-right min-w-0">
                            <span className="font-bold text-sm text-foreground leading-snug">
                              {deadlineMeta.value}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-medium">
                              {deadlineMeta.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isNarrowLayout && (
                        <div className="flex-1 hidden md:flex items-center justify-between w-full ml-4">
                          <div className="flex flex-col gap-1.5 min-w-[180px] xl:min-w-[220px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">
                                {displayId}
                              </span>
                              {isNew && (
                                <Badge
                                  variant="secondary"
                                  className="bg-[#4318FF]/10 text-[#4318FF] hover:bg-[#4318FF]/10 text-[11px] px-2.5 py-0.5 rounded-full font-semibold border-0 shrink-0"
                                >
                                  New Request
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-semibold text-sm text-foreground/90 truncate max-w-[120px] xl:max-w-[150px]">
                                {brand.brandName}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold border-transparent",
                                  badgeColor,
                                )}
                              >
                                {badgeLabel}
                              </Badge>
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

                          <div className="flex flex-col gap-2 min-w-[140px] xl:min-w-[180px] items-start justify-center">
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
              <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-6 mt-8 pb-4 w-full">
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
          isDesktop ? (
            <CreatorOrdersDetailsPanel
              selectedOrderId={selectedOrderId}
              selectedItem={selectedItem}
              activeTab={activeTab}
              onClose={() => setSelectedOrderId(null)}
              onTabChange={handleTabChange}
            />
          ) : (
            <Drawer
              open={!!selectedOrderId}
              onOpenChange={(open) => !open && setSelectedOrderId(null)}
            >
              <DrawerContent className="max-h-[90vh] p-0 bg-background border-none">
                <DrawerTitle className="sr-only">Order Details</DrawerTitle>
                <div className="overflow-y-auto w-full h-full p-4 sm:p-6 pb-8">
                  <CreatorOrdersDetailsPanel
                    selectedOrderId={selectedOrderId}
                    selectedItem={selectedItem}
                    activeTab={activeTab}
                    onClose={() => setSelectedOrderId(null)}
                    onTabChange={handleTabChange}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )
        )}
      </div>
    </div>
  );
}

export function CreatorOrdersList() {
  return (
    <Suspense
      fallback={
        <div className="w-full mx-auto space-y-8 pb-4 pt-4 lg:pt-5">
          <Skeleton className="h-10 w-full max-w-3xl" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      }
    >
      <CreatorOrdersListInner />
    </Suspense>
  );
}
