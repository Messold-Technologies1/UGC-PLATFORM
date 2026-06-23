"use client";

import { cn } from "@/lib/utils";
import { STATUS_TABS } from "../../constants";

interface OrderStatusTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabCounts: Record<string, number>;
}

export function OrderStatusTab({
  activeTab,
  onTabChange,
  tabCounts,
}: OrderStatusTabProps) {
  return (
    <div
      id="orders-toolbar"
      className="flex flex-wrap items-center gap-3.5 mb-5"
    >
      <div className="flex w-full flex-wrap gap-1 rounded-[14px] border border-border bg-card p-1.5 shadow-sm">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key] ?? 0;

          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-bold transition-colors duration-150",
                isActive
                  ? "bg-foreground text-white"
                  : "bg-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-[7px] py-px text-[11px] font-extrabold leading-tight",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
