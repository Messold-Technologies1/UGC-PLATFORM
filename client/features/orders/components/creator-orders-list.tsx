"use client";

import { useState, type MouseEvent, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  CalendarDays,
  CheckCircle2,
  X,
  ExternalLink,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
import { useGetCreatorOrderDetailsQuery } from "../hooks/use-get-creator-order-details-query";
import { useGetOrderBriefQuery } from "../hooks/use-get-order-brief-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLORS, STATUS_LABELS } from "../constants";
import { cn } from "@/lib/utils";
// import type { CreatorOrderListItem } from "../api/get-creator-orders";

const TAB_DEFINITIONS = [
  { id: "all", label: "All Orders", statuses: [] },
  { 
    id: "new", 
    label: "New Requests", 
    statuses: ["PENDING_PAYMENT", "BRIEF_SUBMISSION_PENDING", "BRIEF_SUBMITTED"] 
  },
  {
    id: "active",
    label: "Active",
    statuses: ["BRIEF_ACCEPTED", "PRODUCT_SHIPPED", "PRODUCT_RECEIVED"],
  },
  { 
    id: "revisions", 
    label: "Revisions", 
    statuses: ["REVISION_REQUESTED"] 
  },
  { 
    id: "delivered", 
    label: "Delivered", 
    statuses: ["DELIVERED", "REVISION_SUBMITTED"] 
  },
  { 
    id: "completed", 
    label: "Completed", 
    statuses: ["ACCEPTED", "CREATOR_PAYMENT_DONE"] 
  },
  { 
    id: "cancelled", 
    label: "Cancelled", 
    statuses: ["REJECTED", "REFUNDED", "DISPUTED"] 
  },
];

const TIMELINE_STEPS = [
  {
    id: "accepted",
    label: "Order Accepted",
    desc: "11 May 2025, 10:20 AM",
    status: "completed",
  },
  {
    id: "shipped",
    label: "Product Shipped",
    desc: "Waiting for brand to ship the product",
    status: "current",
  },
  {
    id: "received",
    label: "Product Received",
    desc: "Mark the product as received to get started",
    status: "pending",
  },
  {
    id: "progress",
    label: "In Progress",
    desc: "Start creating your content",
    status: "pending",
  },
  {
    id: "delivered",
    label: "Delivered",
    desc: "Submit the final content for review",
    status: "pending",
  },
  {
    id: "completed",
    label: "Completed",
    desc: "Get paid after approval",
    status: "pending",
  },
];

export function CreatorOrdersList() {
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(6);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading } = useGetCreatorOrdersQuery({ page: 1, limit: 50 });

  const allItems = data?.items || [];

  const dynamicTabs = useMemo(() => {
    return TAB_DEFINITIONS.map((tab) => {
      let count = 0;
      if (tab.id === "all") {
        count = data?.total ?? allItems.length;
      } else {
        count = allItems.filter((item) =>
          tab.statuses.includes(item.order.status as string),
        ).length;
      }
      return {
        ...tab,
        count,
        active: activeTab === tab.id,
      };
    });
  }, [allItems, activeTab, data?.total]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return allItems;
    const tabDef = TAB_DEFINITIONS.find((t) => t.id === activeTab);
    if (!tabDef) return allItems;
    return allItems.filter((item) =>
      tabDef.statuses.includes(item.order.status as string),
    );
  }, [allItems, activeTab]);

  const total = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const paginatedItems = filteredItems.slice((page - 1) * limit, page * limit);

  const selectedItem = useMemo(() => {
    return allItems.find((item) => item.order.id === selectedOrderId);
  }, [allItems, selectedOrderId]);

  const { data: detailsData, isLoading: isLoadingDetails } =
    useGetCreatorOrderDetailsQuery(selectedOrderId as string, {
      enabled: Boolean(selectedOrderId),
    });

  const { data: briefData, isLoading: isLoadingBrief } = useGetOrderBriefQuery(
    selectedOrderId as string,
    { enabled: Boolean(selectedOrderId) },
  );

  const isLoadingRightPanel = isLoadingDetails || isLoadingBrief;

  return (
    <div className="px-8 pb-8 pt-0 md:px-12 md:pb-12 md:pt-2 w-full mx-auto space-y-8 min-h-screen">
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-3xl tracking-tight mb-1">
            Orders
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage all your orders and track your progress.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-lg flex items-center gap-2 border-border/60 bg-background hover:bg-accent/50 shadow-sm h-10 font-semibold"
          >
            <CalendarDays className="w-4 h-4" />
            Availability Calendar
          </Button>
        </div>
      </section>

      <div className="flex items-center gap-2 sm:gap-6 border-b border-border/40 overflow-x-auto pb-px scrollbar-hide">
        {dynamicTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
              setSelectedOrderId(null);
            }}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors px-1",
              tab.active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold",
                tab.active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "grid gap-6 items-start mt-4",
          selectedOrderId ? "lg:grid-cols-[1fr_400px]" : "grid-cols-1",
        )}
      >
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID or brand name..."
                className="pl-9 rounded-lg border-border/50 bg-background h-10 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select>
                <SelectTrigger className="w-full md:w-[130px] rounded-lg border-border/50 bg-background h-10 shadow-sm font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="w-full md:w-[150px] rounded-lg border-border/50 bg-background h-10 shadow-sm font-medium">
                  <SelectValue placeholder="Delivery Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
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

            {!isLoading && paginatedItems.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center text-muted-foreground bg-background rounded-lg border border-border/40">
                <p className="text-sm font-medium text-foreground">
                  No orders yet
                </p>
              </div>
            )}

            {!isLoading &&
              paginatedItems.map(({ order, brand }, i) => {
                const isSelected = selectedOrderId === order.id;
                const displayId = `#${order.id.substring(0, 5).toUpperCase()}`;

                const categories = "Skincare • Product Demo";
                const isNew = i === 0;
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
                      "group relative overflow-hidden bg-background p-4 sm:p-5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between transition-all duration-200 cursor-pointer shadow-sm border",
                      isSelected
                        ? "border-primary ring-1 ring-primary/20 shadow-md"
                        : "border-border/40 hover:border-border hover:shadow-md",
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      <Avatar className="w-12 h-12 rounded-lg border border-border/40 bg-[#e8f5e9] text-[#2e7d32]">
                        <AvatarImage
                          src={brand.logoUrl || undefined}
                          alt={brand.brandName}
                          className="object-cover rounded-lg"
                        />
                        <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                          {brand.brandName.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr] gap-2 sm:gap-6 w-full">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-foreground">
                              {displayId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground/80">
                              {brand.brandName}
                            </h3>
                            {isNew && (
                              <Badge
                                variant="secondary"
                                className="bg-primary/10 text-primary text-[10px] px-1.5 py-0 rounded-sm font-bold uppercase tracking-wider h-4"
                              >
                                New
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col justify-center">
                          <span className="font-bold text-sm text-foreground mb-1">
                            {order.packageNameSnapshot || "UGC Video (60s)"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {categories}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-10 mt-4 sm:mt-0 pl-16 sm:pl-0 w-full sm:w-auto">
                      <div className="flex flex-col items-start min-w-[110px]">
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-bold border-transparent mb-1",
                            STATUS_COLORS[order.status as string] ||
                              "bg-muted text-muted-foreground",
                          )}
                        >
                          {STATUS_LABELS[
                            order.status as keyof typeof STATUS_LABELS
                          ] || order.status}
                          {order.status === "REVISION_REQUESTED" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 ml-1.5 inline-block"></span>
                          )}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {deliveryText}
                        </span>
                      </div>

                      <div className="flex flex-col items-end min-w-[80px]">
                        <span className="font-bold text-sm text-foreground mb-1">
                          {order.priceAmountSnapshot &&
                          parseFloat(order.priceAmountSnapshot) > 0
                            ? new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(parseFloat(order.priceAmountSnapshot))
                            : "₹0"}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {order.status === "COMPLETED"
                            ? "Paid"
                            : order.status === "CANCELLED"
                              ? "—"
                              : "Est. Payout"}
                        </span>
                      </div>

                      <div className="hidden sm:flex text-muted-foreground/50 group-hover:text-foreground transition-colors ml-2">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}

            <div className="flex items-center justify-between border-t border-border/50 pt-8 mt-12 pb-20 w-full">
              <div className="hidden sm:flex items-center space-x-4 min-w-[150px]">
                <div className="flex items-center space-x-1">
                  <span className="text-sm text-muted-foreground">Page</span>
                  <span className="text-sm font-bold text-foreground">
                    {page}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    of {totalPages}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground italic border-l border-border/50 pl-4 hidden md:inline-block">
                  Showing{" "}
                  {paginatedItems.length === 0 ? 0 : (page - 1) * limit + 1}-
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

              <div className="hidden sm:flex items-center space-x-2 min-w-[150px] justify-end">
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
        </div>

        {selectedOrderId && selectedItem && (
          <div className="bg-background rounded-lg border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col h-fit sticky top-24">
            <div className="flex items-center justify-between p-5 border-b border-border/40">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg">
                  Order #{selectedItem.order.id.substring(0, 5).toUpperCase()}
                </h2>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[11px] font-bold px-2 py-0.5",
                    STATUS_COLORS[selectedItem.order.status as string] ||
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {STATUS_LABELS[
                    selectedItem.order.status as keyof typeof STATUS_LABELS
                  ] || selectedItem.order.status}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 rounded-lg bg-[#e8f5e9] text-[#2e7d32]">
                    <AvatarImage
                      src={selectedItem.brand.logoUrl || undefined}
                      className="object-cover rounded-lg"
                    />
                    <AvatarFallback className="bg-transparent font-bold rounded-lg text-lg">
                      {selectedItem.brand.brandName
                        .substring(0, 1)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-base">
                      {selectedItem.brand.brandName}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Skincare • Product Demo
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="rounded-lg h-9 text-xs font-semibold gap-1.5 border-border/50 text-primary hover:text-primary"
                >
                  View Brief <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm">Order Summary</h4>
                {isLoadingRightPanel ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-8 w-full mt-4" />
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Video Type</span>
                      <span className="font-medium text-foreground text-right">
                        {selectedItem.order.packageNameSnapshot ||
                          "UGC Video (60s)"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style</span>
                      <span className="font-medium text-foreground text-right">
                        {briefData?.brief?.toneStyle?.join(", ") || "Standard"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Key Points</span>
                      <span className="font-medium text-foreground text-right">
                        {briefData?.brief?.keyNoteToInclude
                          ? "Included in Brief"
                          : "None"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-muted-foreground">Add-ons</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {detailsData?.order?.addOnsSnapshot &&
                        detailsData.order.addOnsSnapshot.length > 0 ? (
                          detailsData.order.addOnsSnapshot.map((addon) => (
                            <span
                              key={addon.id}
                              className="bg-muted px-2 py-0.5 rounded-md text-[10px] font-semibold text-foreground/80"
                            >
                              {addon.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            None
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between pt-3">
                      <span className="text-muted-foreground">
                        Total Payout
                      </span>
                      <span className="font-bold text-foreground text-right">
                        {selectedItem.order.priceAmountSnapshot &&
                        parseFloat(selectedItem.order.priceAmountSnapshot) > 0
                          ? new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                              maximumFractionDigits: 0,
                            }).format(
                              parseFloat(
                                selectedItem.order.priceAmountSnapshot,
                              ),
                            )
                          : "₹0"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-sm">Timeline</h4>
                <div className="relative space-y-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                  {TIMELINE_STEPS.map((step, idx) => {
                    let label = step.label;
                    let desc = step.desc;
                    let status = step.status;

                    if (step.id === "accepted") {
                      label = "Brief Accepted";
                      if (briefData?.briefAcceptedAt) {
                        desc = new Intl.DateTimeFormat("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        }).format(new Date(briefData.briefAcceptedAt));
                        status = "completed";
                      } else {
                        desc = "Waiting for brief to be accepted";
                        status = "pending";
                      }
                    }

                    return (
                      <div
                        key={step.id}
                        className="relative flex items-start pl-8"
                      >
                        <div className="absolute left-0 top-0.5 flex items-center justify-center bg-background ring-4 ring-background rounded-full">
                          {status === "completed" ? (
                            <div className="w-5 h-5 rounded-md bg-[#4318FF] flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted/50 flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              "text-sm font-semibold mb-0.5",
                              status === "completed"
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {label}
                          </span>
                          <span className="text-[11px] text-muted-foreground leading-snug">
                            {desc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border/40 flex items-center gap-3 bg-accent/20 mt-auto">
              <Button
                variant="outline"
                className="flex-1 rounded-lg h-11 font-semibold border-border/60 bg-background"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Brand
              </Button>
              <Button
                asChild
                className="flex-1 rounded-lg h-11 font-bold bg-[#4318FF] hover:bg-[#4318FF]/90 text-white shadow-md"
              >
                <Link href={`/creator/orders/${selectedOrderId}`}>
                  View Order Details
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
