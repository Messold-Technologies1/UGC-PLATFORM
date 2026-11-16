"use client";

import { MessageSquare } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEventsQuery } from "../hooks/use-my-events-query";
import { EventPostCard } from "./event-post-card";

export function MyEventsList() {
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyEventsQuery();

  const events = data?.pages.flatMap((page) => page.items) ?? [];

  if (isPending) {
    return (
      <div className="flex flex-col gap-3.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-gc-lg border border-border bg-card p-5 sm:px-6"
          >
            <Skeleton className="mb-3.5 h-6 w-28 rounded-full" />
            <Skeleton className="mb-2.5 h-3 w-full rounded-md" />
            <Skeleton className="h-3 w-3/5 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-gc-lg border border-dashed border-border bg-card px-5 py-10 text-center">
        <p className="text-sm font-bold">Couldn&rsquo;t load your posts</p>
        <p className="mt-1 text-xs text-gc-ink-muted">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-gc-lg border border-dashed border-border bg-card px-5 py-12 text-center">
        <div className="mb-3.5 flex size-12 items-center justify-center rounded-gc-sm bg-gc-brand-soft">
          <MessageSquare
            className="size-5 text-gc-tint-rose-ink"
            aria-hidden="true"
          />
        </div>
        <p className="text-sm font-extrabold">Nothing posted yet</p>
        <p className="mt-1 max-w-56 text-xs leading-relaxed text-gc-ink-muted">
          Travelling somewhere? Shooting something? Write a line and brands will
          see it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      {events.map((event) => (
        <EventPostCard key={event.id} event={event} />
      ))}

      {hasNextPage ? (
        <button
          type="button"
          onClick={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mx-auto mt-1 inline-flex min-h-10 items-center rounded-full border border-border bg-card px-5 text-[13px] font-bold text-gc-ink-soft hover:bg-muted disabled:opacity-60"
        >
          {isFetchingNextPage ? "Loading…" : "Show older posts"}
        </button>
      ) : null}
    </div>
  );
}
