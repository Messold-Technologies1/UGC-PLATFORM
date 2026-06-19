"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ADMIN_CREATOR_TABS,
  getAdminCreatorSegmentCount,
} from "@/features/admin/constants/admin-creator-tabs";
import type {
  AdminCreatorListSegment,
  AdminCreatorSegmentCountsDto,
} from "@/features/admin/types";

export function AdminCreatorSegmentTabs({
  value,
  counts,
  countsLoading = false,
  onChange,
  trailing,
}: {
  value: AdminCreatorListSegment;
  counts?: AdminCreatorSegmentCountsDto;
  countsLoading?: boolean;
  onChange: (segment: AdminCreatorListSegment) => void;
  trailing?: ReactNode;
}) {
  return (
    <nav className="border-b border-border/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto scrollbar-none sm:gap-2">
        {ADMIN_CREATOR_TABS.map((tab) => {
          const isActive = tab.value === value;
          const count = getAdminCreatorSegmentCount(counts, tab.value);
          const Icon = tab.icon;

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={cn(
                "group relative flex shrink-0 items-center gap-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors sm:px-4",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-foreground" : "text-muted-foreground/70",
                )}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={cn(
                  "inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  isActive ? tab.badgeClassName : "bg-muted text-muted-foreground",
                )}
              >
                {countsLoading ? "…" : (count ?? 0)}
              </span>
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0 h-0.5 rounded-full transition-opacity",
                  isActive ? "bg-foreground opacity-100" : "opacity-0",
                )}
              />
            </button>
          );
        })}
        </div>
        {trailing ? (
          <div className="w-full shrink-0 pb-2 sm:w-auto sm:pb-3">{trailing}</div>
        ) : null}
      </div>
    </nav>
  );
}
