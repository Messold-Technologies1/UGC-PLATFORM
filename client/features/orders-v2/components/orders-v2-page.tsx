"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORDER_V2_TABS, TAB_STATUS_MAP, type OrderV2Tab } from "../constants";
import { useOrdersV2Query } from "../hooks/use-orders-v2-query";
import { OrdersV2List } from "./orders-v2-list";
import { OrdersV2SummaryPanel } from "./orders-v2-summary-panel";
import { OrdersV2RequestPanel } from "./orders-v2-request-panel";
import type { OrderV2Item } from "../mock/orders-v2-mock-data";

export function OrdersV2Page() {
  const [activeTab, setActiveTab] = useState<OrderV2Tab>("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderV2Item | null>(null);

  const { orders, counts, isLoading } = useOrdersV2Query(activeTab);

  const filtered = search.trim()
    ? orders.filter(
        (o) =>
          o.id.toLowerCase().includes(search.toLowerCase()) ||
          o.brand.name.toLowerCase().includes(search.toLowerCase()) ||
          o.packageName.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const handleSelect = (order: OrderV2Item) => {
    setSelectedOrder((prev) => (prev?.id === order.id ? null : order));
  };

  const panelOpen = !!selectedOrder;

  const tabCount = (tab: OrderV2Tab): number => {
    if (tab === "ALL") return counts["ALL"] ?? 0;
    if (tab === "ACTIVE")
      return (
        (counts["AWAITING_SHIPMENT"] ?? 0) + (counts["IN_PROGRESS"] ?? 0)
      );
    return counts[TAB_STATUS_MAP[tab][0]] ?? 0;
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-background">
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 border-b border-border bg-background">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Orders</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your active and past collaborations
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-0.5 scrollbar-none">
          {ORDER_V2_TABS.map((tab) => {
            const count = tabCount(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSelectedOrder(null);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                      activeTab === tab.key
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-background">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders, brands..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
          <SlidersHorizontal className="size-4" />
          Filters
        </button>
      </div>

      {/* Split layout */}
      <div
        className={cn(
          "flex flex-1 overflow-hidden",
          panelOpen ? "divide-x divide-border" : ""
        )}
      >
        {/* Left: order list */}
        <div
          className={cn(
            "flex flex-col overflow-y-auto",
            panelOpen ? "w-[380px] shrink-0" : "w-full"
          )}
        >
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : (
            <OrdersV2List
              orders={filtered}
              selectedId={selectedOrder?.id ?? null}
              onSelect={handleSelect}
            />
          )}
          {/* Pagination hint */}
          {!isLoading && filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
              Showing {filtered.length} of {counts["ALL"] ?? 0} orders
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {panelOpen && (
          <div className="flex-1 overflow-y-auto">
            {selectedOrder?.status === "NEW_REQUEST" ? (
              <OrdersV2RequestPanel
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
              />
            ) : (
              <OrdersV2SummaryPanel
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
