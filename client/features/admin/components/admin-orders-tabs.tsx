"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPINE_COLOR } from "@/features/orders/constants";
import type { AdminOrderListItemDto } from "@/features/admin/types";

export const ADMIN_ORDER_TABS = [
  { key: "all", label: "All", mobileLabel: "All" },
  { key: "brief", label: "Brief Required", mobileLabel: "Brief" },
  { key: "payment", label: "Awaiting Payment", mobileLabel: "Payment" },
  { key: "progress", label: "In Progress", mobileLabel: "Active" },
  { key: "review", label: "In Review", mobileLabel: "Review" },
  { key: "completed", label: "Completed", mobileLabel: "Done" },
  { key: "cancelled", label: "Cancelled", mobileLabel: "Cancel" },
] as const;

export const ADMIN_ORDER_TAB_GROUPS: Record<string, string[]> = {
  all: [],
  brief: ["BRIEF_SUBMISSION_PENDING"],
  payment: ["PENDING_PAYMENT"],
  progress: [
    "BRIEF_SUBMITTED",
    "BRIEF_ACCEPTED",
    "PRODUCT_SHIPPED",
    "PRODUCT_RECEIVED",
  ],
  review: ["DELIVERED", "REVISION_REQUESTED", "REVISION_SUBMITTED"],
  completed: ["ACCEPTED", "CREATOR_PAYMENT_DONE"],
  cancelled: ["DISPUTED", "REJECTED", "REFUNDED"],
};

export type AdminOrderTabKey = (typeof ADMIN_ORDER_TABS)[number]["key"];

export const ADMIN_ORDER_TAB_KEYS = ADMIN_ORDER_TABS.map((t) => t.key);

export function isAdminOrderTab(
  value: string | null | undefined,
): value is AdminOrderTabKey {
  return (
    value != null && ADMIN_ORDER_TAB_KEYS.includes(value as AdminOrderTabKey)
  );
}

export function getAdminOrderTabForStatus(status: string): AdminOrderTabKey {
  for (const [group, statuses] of Object.entries(ADMIN_ORDER_TAB_GROUPS)) {
    if (group === "all") continue;
    if (statuses.includes(status)) return group as AdminOrderTabKey;
  }
  return "completed";
}

export function filterItemsByTab(
  items: AdminOrderListItemDto[],
  tab: AdminOrderTabKey,
): AdminOrderListItemDto[] {
  if (tab === "all") return items;
  const statuses = ADMIN_ORDER_TAB_GROUPS[tab];
  if (!statuses || statuses.length === 0) return items;
  return items.filter((item) => statuses.includes(item.order.status));
}

const TAB_ACCENT: Record<string, string> = {
  all: "#6366f1",
  brief: SPINE_COLOR.brief,
  payment: SPINE_COLOR.payment,
  progress: SPINE_COLOR.progress,
  review: SPINE_COLOR.review,
  completed: SPINE_COLOR.completed,
  cancelled: "#ef3e51",
};

interface AdminOrdersTabsProps {
  activeTab: AdminOrderTabKey;
  onTabChange: (tab: AdminOrderTabKey) => void;
  allItems: AdminOrderListItemDto[];
  totalCount?: number;
}

export function AdminOrdersTabs({
  activeTab,
  onTabChange,
  allItems,
  totalCount,
}: AdminOrdersTabsProps) {
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
    return ADMIN_ORDER_TABS.map((tab) => {
      let count: number;
      if (tab.key === "all") {
        count = totalCount ?? allItems.length;
      } else {
        const statuses = ADMIN_ORDER_TAB_GROUPS[tab.key] ?? [];
        count = allItems.filter((item) =>
          statuses.includes(item.order.status),
        ).length;
      }
      return {
        ...tab,
        count,
        active: activeTab === tab.key,
        accent: TAB_ACCENT[tab.key] ?? TAB_ACCENT.all,
      };
    });
  }, [allItems, activeTab, totalCount]);

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/40 pb-px">
      <div className="relative group/tabs">
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-background via-background/95 to-transparent z-10 flex items-center pl-1 pb-3 transition-opacity duration-200 pointer-events-none",
            navArrows.left ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            onClick={() => scrollTabs(-1)}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors pointer-events-auto"
            aria-label="Scroll tabs left"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex items-center gap-1 sm:gap-2 md:gap-5 overflow-x-auto scrollbar-hide relative px-1 sm:px-3 pt-3"
        >
          {dynamicTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors px-1.5 sm:px-2 shrink-0",
                tab.active
                  ? "text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
              )}
              style={
                tab.active
                  ? { borderColor: tab.accent, color: tab.accent }
                  : undefined
              }
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span
                className={cn(
                  "px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold tabular-nums",
                  tab.active
                    ? "text-white"
                    : "bg-muted/50 text-muted-foreground",
                )}
                style={
                  tab.active
                    ? { backgroundColor: `${tab.accent}20`, color: tab.accent }
                    : undefined
                }
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-background via-background/95 to-transparent z-10 flex items-center justify-end pr-1 pb-3 transition-opacity duration-200 pointer-events-none",
            navArrows.right ? "opacity-100" : "opacity-0",
          )}
        >
          <button
            type="button"
            onClick={() => scrollTabs(1)}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors pointer-events-auto"
            aria-label="Scroll tabs right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
