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
import { useCreatorSearchActorsQuery } from "./use-creator-search-analytics";

/**
 * Which brand or agency set which filter, behind the audience card.
 *
 * An agency is its own row, named after the agency, with the brands it was
 * acting for listed beside it — grouping it under the brand would make an
 * agency's work read as the brand's own.
 *
 * Signed-out visitors do not appear: they carry neither id, and on current
 * traffic they are the majority of searches, so they would amount to one
 * enormous "unknown" row that answers nothing.
 */
export function ActorFilterUsageDialog({
  open,
  onOpenChange,
  params,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  params: { from?: string; to?: string };
}) {
  const { data, isLoading, isError, error } = useCreatorSearchActorsQuery(
    params,
    open,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Which brand or agency filtered for what</DialogTitle>
          <DialogDescription>
            Brands and agencies that searched in this window, busiest first. An
            agency is listed under its own name, with the brands it was working
            for. Signed-out visitors are not identifiable and are not listed.
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
            No signed-in brand or agency searched in this window. The searches
            recorded here came from signed-out visitors.
          </p>
        ) : (
          <ul className="space-y-3 py-1">
            {data.map((actor) => (
              <li
                key={actor.actorId}
                className="rounded-xl border border-border/60 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{actor.label}</span>
                    {actor.kind === "AGENCY" ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                        Agency
                      </span>
                    ) : null}
                    {actor.onBehalfOf.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        for {actor.onBehalfOf.join(", ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {actor.searches.toLocaleString("en-IN")}{" "}
                    {actor.searches === 1 ? "search" : "searches"}
                    {actor.zeroResultSearches > 0
                      ? ` · ${actor.zeroResultSearches} found nothing`
                      : ""}
                    {" · last "}
                    {new Date(actor.lastSearchedAt).toLocaleDateString(
                      "en-IN",
                      { day: "numeric", month: "short" },
                    )}
                  </span>
                </div>

                {actor.filters.length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Browsed without setting any filter.
                  </p>
                ) : (
                  <div className="mt-2.5 space-y-1.5">
                    {actor.filters.map((f) => (
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
