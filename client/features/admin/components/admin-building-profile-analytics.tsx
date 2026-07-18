"use client";

import { AlertCircle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminBuildingProfileAnalyticsQuery } from "@/features/admin/hooks/use-admin-building-profile-analytics-query";

/**
 * Analytics for the "Building profile" segment: for every creator still
 * finishing their go-live checklist (completeProfile = false), how many are
 * missing each required field. Surfaces the biggest drop-off points so admins
 * know what to nudge creators on.
 */
export function AdminBuildingProfileAnalytics({
  enabled = true,
}: {
  enabled?: boolean;
}) {
  const { data, isLoading, isError } =
    useAdminBuildingProfileAnalyticsQuery(enabled);

  if (isError) {
    return (
      <div className="glass-panel flex items-center justify-center gap-2 rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground">
        <AlertCircle className="size-4" />
        We could not load building-profile analytics right now. Try again
        shortly.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="glass-panel space-y-3 rounded-2xl border border-border/10 bg-card/10 p-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={`analytics-skeleton-${index}`} className="h-9 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const totalProfiles = data?.totalProfiles ?? 0;
  const fields = data?.fields ?? [];
  const maxCount = fields.reduce(
    (max, field) => Math.max(max, field.incompleteCount),
    0,
  );

  if (totalProfiles === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-border/10 bg-card/10 py-20 text-center text-sm text-muted-foreground">
        No creators are still building their profile — nothing to analyse.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-center gap-4 rounded-2xl border border-border/10 bg-card/10 p-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ListChecks className="size-6" />
        </span>
        <div>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {totalProfiles.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-muted-foreground">
            profiles still building — the field counts below are out of this
            total.
          </p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-2xl border border-border/10 bg-card/10">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Incomplete fields
          </h2>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Profiles missing each field
          </span>
        </div>

        <ul className="divide-y divide-border/40">
          {fields.map((field) => {
            const barWidth =
              maxCount === 0
                ? 0
                : Math.round((field.incompleteCount / maxCount) * 100);
            return (
              <li
                key={field.key}
                className="flex items-center gap-4 px-6 py-3"
              >
                <span className="w-48 shrink-0 truncate text-sm font-medium text-foreground">
                  {field.label}
                </span>

                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      field.incompleteCount > 0
                        ? "bg-amber-500"
                        : "bg-transparent",
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                  {field.incompleteCount.toLocaleString("en-IN")}
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {field.percentage}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
