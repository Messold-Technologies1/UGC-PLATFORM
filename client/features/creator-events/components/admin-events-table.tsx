"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateRange } from "../lib/format-date-range";
import type { AdminCreatorEventApi, AdminEventStatus } from "../api/types";
import {
  useAdminEventsQuery,
  useUnhideEventMutation,
} from "../hooks/use-admin-events";
import { HideEventDialog } from "./hide-event-dialog";

const TABS: { value: AdminEventStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

function formatPosted(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ROW_ACTION_CLASS =
  "inline-flex min-h-9 items-center rounded-full border border-border bg-card px-4 text-[13px] font-bold text-gc-ink-soft hover:bg-muted disabled:opacity-60";

/**
 * Hiding opens a dialog (the reason it collects is what the creator reads on
 * their own card, so it deserves a real field). Unhiding takes no reason, so
 * it stays a single click.
 */
function RowAction({
  event,
  onHide,
}: {
  event: AdminCreatorEventApi;
  onHide: (event: AdminCreatorEventApi) => void;
}) {
  const unhide = useUnhideEventMutation();

  if (event.hiddenAt) {
    return (
      <button
        type="button"
        onClick={() => unhide.mutate(event.id)}
        disabled={unhide.isPending}
        className={ROW_ACTION_CLASS}
      >
        {unhide.isPending ? "Unhiding…" : "Unhide"}
      </button>
    );
  }

  return (
    <button type="button" onClick={() => onHide(event)} className={ROW_ACTION_CLASS}>
      Hide
    </button>
  );
}

export function AdminEventsTable() {
  const [status, setStatus] = useState<AdminEventStatus>("all");
  const [hiding, setHiding] = useState<AdminCreatorEventApi | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAdminEventsQuery({ status, search });

  const rows = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              aria-pressed={status === tab.value}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-4 text-[13px] font-bold",
                status === tab.value
                  ? "bg-gc-ink text-white"
                  : "border border-border bg-card text-gc-ink-soft hover:bg-muted",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <label htmlFor="admin-event-search" className="sr-only">
            Search posts
          </label>
          <Input
            id="admin-event-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => setSearch(searchInput.trim())}
            placeholder="Search text or creator ID"
            className="h-10 w-62 rounded-full"
          />
        </form>
      </div>

      <div className="overflow-x-auto rounded-gc-lg border border-border bg-card">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">
            Creator event posts, newest first
          </caption>
          <thead>
            <tr className="bg-muted">
              {["Creator", "Post", "Posted", "Status", ""].map((head, i) => (
                <th
                  key={head || "action"}
                  scope="col"
                  className={cn(
                    "border-b border-border px-5 py-3.5 text-[11px] font-extrabold uppercase tracking-wider text-gc-ink-muted",
                    i === 4 && "text-right",
                  )}
                >
                  {head || "Action"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              [0, 1, 2, 3].map((i) => (
                <tr key={i}>
                  <td colSpan={5} className="border-b border-border/60 px-5 py-4">
                    <Skeleton className="h-4 w-full rounded-md" />
                  </td>
                </tr>
              ))
            ) : isError ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm">
                  Couldn&rsquo;t load posts. Refresh to try again.
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-10 text-center text-sm text-gc-ink-muted"
                >
                  No posts match this view.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={cn(row.hiddenAt && "bg-gc-brand-soft/35")}>
                  <td className="border-b border-border/60 px-5 py-4 align-top">
                    <span className="text-[13px] font-bold">{row.creatorName}</span>
                  </td>
                  <td className="max-w-96 border-b border-border/60 px-5 py-4 align-top text-[13px] leading-relaxed text-gc-ink-muted">
                    {row.body}
                    {formatDateRange(row.startsOn, row.endsOn) ? (
                      <span className="mt-1.5 block text-[11px] font-semibold text-gc-muted">
                        {formatDateRange(row.startsOn, row.endsOn)}
                        {row.ended ? " · finished" : ""}
                      </span>
                    ) : null}
                  </td>
                  <td className="border-b border-border/60 px-5 py-4 align-top text-xs whitespace-nowrap text-gc-muted">
                    {formatPosted(row.createdAt)}
                  </td>
                  <td className="border-b border-border/60 px-5 py-4 align-top">
                    {row.hiddenAt ? (
                      <>
                        <span className="inline-block rounded-full bg-gc-brand-soft px-2.5 py-1 text-[11px] font-bold text-gc-tint-rose-ink">
                          Hidden
                        </span>
                        {row.hiddenReason || row.hiddenByName ? (
                          <span className="mt-1.5 block text-[11px] leading-snug text-gc-muted">
                            {[row.hiddenReason, row.hiddenByName && `by ${row.hiddenByName}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="inline-block rounded-full bg-gc-success-soft px-2.5 py-1 text-[11px] font-bold text-gc-success-ink">
                        Visible
                      </span>
                    )}
                  </td>
                  <td className="border-b border-border/60 px-5 py-3 text-right align-top">
                    <RowAction event={row} onHide={setHiding} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {hasNextPage ? (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto inline-flex min-h-10 items-center rounded-full border border-border bg-card px-5 text-[13px] font-bold text-gc-ink-soft hover:bg-muted disabled:opacity-60"
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : null}

      <p className="max-w-[40rem] text-xs leading-relaxed text-gc-muted">
        Hiding takes a post out of the brand feed at once and records who did
        it. The creator keeps seeing it in their own list with a banner and the
        reason, so nothing disappears on them unexplained. It is reversible and
        never deletes the post.
      </p>

      <HideEventDialog event={hiding} onClose={() => setHiding(null)} />
    </div>
  );
}
