"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { filterLabel } from "./types";
import { useCreatorSearchBrandsQuery } from "./use-creator-search-analytics";

/**
 * Which brand set which filter, behind the audience card.
 *
 * Only brands appear. A signed-out visitor carries no brand — and on current
 * traffic those are the majority of searches — so including them would mean
 * one enormous "unknown" row that answers nothing.
 */
export function BrandFilterUsageDialog({
  open,
  onOpenChange,
  params,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: { from?: string; to?: string };
}) {
  const { data, isLoading, isError, error } = useCreatorSearchBrandsQuery(
    params,
    open,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Which brand filtered for what</DialogTitle>
          <DialogDescription>
            Brands that searched in this window, busiest first. Signed-out
            visitors carry no brand, so they are not listed here.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p className="py-6 text-sm text-destructive">
            Could not load the breakdown
            {error instanceof Error ? `: ${error.message}` : "."}
          </p>
        ) : isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No signed-in brand searched in this window. The searches recorded
            here came from signed-out visitors.
          </p>
        ) : (
          <ul className="space-y-3 py-1">
            {data.map((brand) => (
              <li
                key={brand.brandProfileId}
                className="rounded-xl border border-border/60 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">{brand.brandLabel}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {brand.searches.toLocaleString("en-IN")}{" "}
                    {brand.searches === 1 ? "search" : "searches"}
                    {brand.zeroResultSearches > 0
                      ? ` · ${brand.zeroResultSearches} found nothing`
                      : ""}
                    {" · last "}
                    {new Date(brand.lastSearchedAt).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                </div>

                {brand.filters.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Browsed without setting any filter.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-1.5">
                    {brand.filters.map((f) => (
                      <div
                        key={f.key}
                        className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm"
                      >
                        <span className="min-w-[8.5rem] font-medium">
                          {filterLabel(f.key)}
                        </span>
                        <span className="tabular-nums text-xs text-muted-foreground">
                          ×{f.searches}
                        </span>
                        {f.topValues.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {f.topValues.map((v) => (
                              <span
                                key={v}
                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                              >
                                {v}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
