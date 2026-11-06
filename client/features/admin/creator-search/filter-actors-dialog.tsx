"use client";

import { useMemo } from "react";

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
 * Who used one filter, opened from that filter's row.
 *
 * Derived from the same per-actor response the page already fetches, inverted
 * here rather than asked for again: the endpoint returns each brand or agency
 * with the filters it set, which is the same data read the other way round.
 * One request answers every filter row.
 *
 * Only brands and agencies appear. Filtering requires an account, so there is
 * nobody else to show.
 */
export function FilterActorsDialog({
  filterKey,
  onClose,
  params,
}: {
  /** The filter being drilled into, or null when the dialog is closed. */
  filterKey: string | null;
  onClose: () => void;
  params: { from?: string; to?: string };
}) {
  const { data, isLoading, isError, error } = useCreatorSearchActorsQuery(
    params,
    filterKey !== null,
  );

  const rows = useMemo(() => {
    if (!data || !filterKey) return [];
    return data
      .map((actor) => {
        const used = actor.filters.find((f) => f.key === filterKey);
        return used ? { actor, used } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.used.searches - a.used.searches);
  }, [data, filterKey]);

  return (
    <Dialog open={filterKey !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Who filtered by {filterKey ? filterLabel(filterKey) : ""}
          </DialogTitle>
          <DialogDescription>
            Brands and agencies that set this filter in the selected window,
            most often first, with the values they chose. An agency is listed
            under its own name.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p className="py-6 text-sm text-destructive">
            Could not load this breakdown
            {error instanceof Error ? `: ${error.message}` : "."}
          </p>
        ) : isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No signed-in brand or agency set this filter in this window.
          </p>
        ) : (
          <ul className="space-y-2 py-1">
            {rows.map(({ actor, used }) => (
              <li
                key={actor.actorId}
                className="rounded-xl border border-border/60 p-3.5"
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
                    {used.searches.toLocaleString("en-IN")}{" "}
                    {used.searches === 1 ? "search" : "searches"}
                    {" · last "}
                    {new Date(actor.lastSearchedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>

                {used.topValues.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {used.topValues.map((v) => (
                      <span
                        key={v}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
