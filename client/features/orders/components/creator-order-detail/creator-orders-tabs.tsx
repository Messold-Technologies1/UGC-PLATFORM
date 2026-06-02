"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const TAB_DEFINITIONS = [
  { id: "all", label: "All Orders", statuses: [] },
  { 
    id: "new", 
    label: "New Requests", 
    statuses: ["PENDING_PAYMENT", "BRIEF_SUBMISSION_PENDING", "BRIEF_SUBMITTED"] 
  },
  {
    id: "active",
    label: "Active",
    statuses: ["BRIEF_ACCEPTED", "PRODUCT_SHIPPED", "PRODUCT_RECEIVED", "DELIVERED", "REVISION_REQUESTED", "REVISION_SUBMITTED"],
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

interface CreatorOrdersTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  allItems: any[];
  totalCount?: number;
}

export function CreatorOrdersTabs({
  activeTab,
  onTabChange,
  allItems,
  totalCount,
}: CreatorOrdersTabsProps) {
  const dynamicTabs = useMemo(() => {
    return TAB_DEFINITIONS.map((tab) => {
      let count = 0;
      if (tab.id === "all") {
        count = totalCount ?? allItems.length;
      } else if (tab.id === "new") {
        count = allItems.filter((item: any) => 
          Boolean(item.order.hasBrief) && tab.statuses.includes(item.order.status as string)
        ).length;
      } else {
        count = allItems.filter((item: any) =>
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
    <div className="flex items-center gap-2 sm:gap-6 border-b border-border/40 overflow-x-auto pb-px scrollbar-hide">
      {dynamicTabs.map((tab) => (
        <button
          key={tab.id}
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
  );
}
