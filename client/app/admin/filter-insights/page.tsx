"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Search, TriangleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreatorSearchAnalyticsQuery } from "@/features/admin/creator-search/use-creator-search-analytics";
import {
  filterLabel,
  type SearchAudience,
} from "@/features/admin/creator-search/types";
import { FilterActorsDialog } from "@/features/admin/creator-search/filter-actors-dialog";

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

const AUDIENCE_OPTIONS = [
  { value: "ALL", label: "Everyone" },
  { value: "BRAND", label: "Brands" },
  { value: "AGENCY", label: "Agencies" },
  { value: "LAPSED", label: "Session expired" },
  { value: "OTHER", label: "Creators / admins" },
  { value: "GUEST", label: "Signed out" },
] as const;

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="h-full p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tabular-nums">{value}</div>
      {hint ? (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </Card>
  );
}

export default function FilterInsightsPage() {
  const [range, setRange] = useState<string>("30");
  const [audience, setAudience] = useState<string>("ALL");
  // Which filter row is drilled into, by key. Null closes the panel.
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null);

  const params = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - Number(range) * 24 * 60 * 60 * 1000);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      ...(audience === "ALL"
        ? {}
        : { audience: audience as SearchAudience }),
    };
  }, [range, audience]);

  const { data, isLoading, isError, error } =
    useCreatorSearchAnalyticsQuery(params);

  const usedFilters = (data?.filters ?? []).filter((f) => f.searches > 0);
  const unusedFilters = (data?.filters ?? []).filter((f) => f.searches === 0);
  const maxSearches = usedFilters[0]?.searches ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Filter insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Which filters people actually use on the creator browse list. One
            row per search &mdash; scrolling further down a result list is the
            same search, not a new one.
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <Card className="p-6 text-sm text-destructive">
          Could not load search insights
          {error instanceof Error ? `: ${error.message}` : "."}
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : !data || data.totalSearches === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-sm font-semibold">No searches recorded yet</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Searches are recorded from the moment this feature ships &mdash;
            there is no history before that. Give it a few days of real traffic,
            or widen the date range.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Searches"
              value={data.totalSearches.toLocaleString("en-IN")}
              hint={`${data.unfilteredSearches.toLocaleString("en-IN")} set no filter at all`}
              icon={<Search className="size-3.5" />}
            />
            <StatCard
              label="Found nothing"
              value={data.zeroResultSearches.toLocaleString("en-IN")}
              hint={
                data.totalSearches
                  ? `${Math.round(
                      (data.zeroResultSearches / data.totalSearches) * 100,
                    )}% of searches — demand you cannot supply`
                  : undefined
              }
              icon={<TriangleAlert className="size-3.5" />}
            />
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Most used filters
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Select a filter to see which brands and agencies used it.
            </p>
            <div className="mt-4 space-y-3">
              {usedFilters.map((f) => (
                // The whole row opens the breakdown: who set this filter.
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setOpenFilterKey(f.key)}
                  className="group block w-full rounded-lg p-2 -mx-2 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-1.5 font-medium">
                      {filterLabel(f.key)}
                      <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {f.searches.toLocaleString("en-IN")} ({f.shareOfSearches}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${
                          maxSearches ? (f.searches / maxSearches) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                  {f.topValues.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {f.topValues.map((v) => (
                        <span
                          key={v.value}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          {v.value}
                          <span className="ml-1 font-semibold tabular-nums">
                            {v.searches}
                          </span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>

            {unusedFilters.length > 0 ? (
              <p className="mt-5 border-t pt-3 text-xs text-muted-foreground">
                <span className="font-semibold">Never used in this window:</span>{" "}
                {unusedFilters.map((f) => filterLabel(f.key)).join(", ")}.
              </p>
            ) : null}
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Most typed search terms
              </h2>
              {data.topSearchTerms.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Nobody used the search box.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {data.topSearchTerms.map((t) => (
                    <li key={t.term} className="flex justify-between gap-3">
                      <span className="truncate">{t.term}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {t.searches}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Filters present when nothing matched
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                The filters most often set on searches that returned zero
                creators &mdash; where the catalogue is thin.
              </p>
              {data.topZeroResultFilters.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Every search found at least one creator.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {data.topZeroResultFilters.map((f) => (
                    <li key={f.key} className="flex justify-between gap-3">
                      <span className="truncate">{filterLabel(f.key)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {f.searches}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      <FilterActorsDialog
        filterKey={openFilterKey}
        onClose={() => setOpenFilterKey(null)}
        params={{ from: params.from, to: params.to }}
      />
    </div>
  );
}
