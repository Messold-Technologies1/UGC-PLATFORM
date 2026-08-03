"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CreatorOrderListItem } from "../../api/get-creator-orders";

export const TAB_DEFINITIONS = [
  { id: "all", label: "All Orders", statuses: [] },
  { 
    id: "new", 
    label: "New Requests", 
    statuses: ["BRIEF_SUBMISSION_PENDING", "BRIEF_SUBMITTED"] 
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
    id: "dispute",
    label: "Dispute",
    statuses: ["DISPUTED"],
  },
  {
    id: "cancelled",
    label: "Cancelled",
    statuses: ["REJECTED", "REFUNDED"]
  },
];

export const CREATOR_ORDERS_TAB_IDS = TAB_DEFINITIONS.map((tab) => tab.id);

export function isCreatorOrdersTab(
  value: string | null,
): value is (typeof TAB_DEFINITIONS)[number]["id"] {
  return value != null && CREATOR_ORDERS_TAB_IDS.includes(value);
}

export function getCreatorOrdersTabForStatus(status?: string): string {
  if (!status) return "new";
  const tab = TAB_DEFINITIONS.find(
    (t) => t.id !== "all" && t.statuses.includes(status),
  );
  return tab?.id ?? "all";
}

export function getCreatorOrdersPageHref(
  orderId: string,
  status?: string,
): string {
  const tab = getCreatorOrdersTabForStatus(status);
  const params = new URLSearchParams({ orderId });
  if (tab !== "all") params.set("tab", tab);
  return `/creator/orders?${params.toString()}`;
}

interface CreatorOrdersTabsProps {
  activeTab: string;
  onTabChange: (tabId: string, selectOrderId?: string) => void;
  allItems: CreatorOrderListItem[];
  totalCount?: number;
}

export function CreatorOrdersTabs({
  activeTab,
  onTabChange,
  allItems,
  totalCount,
}: CreatorOrdersTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [navArrows, setNavArrows] = useState({ left: false, right: false });

  const updateNavArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setNavArrows({
      left: scrollLeft > 4,
      right: scrollLeft + clientWidth < scrollWidth - 4,
    });
  }, []);

  const scrollTabs = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir * Math.max(150, el.clientWidth * 0.5),
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateNavArrows();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateNavArrows)
        : null;
    ro?.observe(el);
    el.addEventListener("scroll", updateNavArrows, { passive: true });
    window.addEventListener("resize", updateNavArrows);
    return () => {
      ro?.disconnect();
      el.removeEventListener("scroll", updateNavArrows);
      window.removeEventListener("resize", updateNavArrows);
    };
  }, [updateNavArrows]);

  const dynamicTabs = useMemo(() => {
    return TAB_DEFINITIONS.map((tab) => {
      let count = 0;
      if (tab.id === "all") {
        count = totalCount ?? allItems.length;
      } else if (tab.id === "new") {
        count = allItems.filter((item) =>
          Boolean(item.order.hasBrief) && tab.statuses.includes(item.order.status as string)
        ).length;
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
  }, [allItems, activeTab, totalCount]);

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 pb-px pt-3">
      <div className="relative group/tabs">
        {/* Left Arrow Fade & Button */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-background via-background/95 to-transparent z-10 flex items-center pl-1 pb-3 transition-opacity duration-200 pointer-events-none",
            navArrows.left ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            type="button"
            onClick={() => scrollTabs(-1)}
            className="h-8 w-8 rounded-full border border-border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors pointer-events-auto"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        <div
          ref={scrollRef}
          data-tour="creator-orders-tabs"
          className="flex items-center gap-2 sm:gap-6 overflow-x-auto scrollbar-hide relative px-2 sm:px-4"
        >
          {dynamicTabs.map((tab) => (
            <button
              key={tab.id}
              data-tour={`creator-orders-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
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

        {/* Right Arrow Fade & Button */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-background via-background/95 to-transparent z-10 flex items-center justify-end pr-1 pb-3 transition-opacity duration-200 pointer-events-none",
            navArrows.right ? "opacity-100" : "opacity-0"
          )}
        >
          <button
            type="button"
            onClick={() => scrollTabs(1)}
            className="h-8 w-8 rounded-full border border-border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors pointer-events-auto"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
