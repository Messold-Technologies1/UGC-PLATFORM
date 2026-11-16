"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEventFeedQuery } from "../hooks/use-event-feed-query";
import { eventDayLabel } from "../lib/format-event-time";
import { EventFeedCard } from "./event-feed-card";

function FeedSkeleton() {
  return (
    <div className="overflow-hidden rounded-gc-lg border border-border bg-card">
      <div className="flex items-center gap-3.5 bg-muted px-5 py-3.5 sm:px-6">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-2 h-3 w-40 rounded-md" />
          <Skeleton className="h-2.5 w-24 rounded-md" />
        </div>
      </div>
      <div className="px-5 py-6 sm:px-6">
        <Skeleton className="mb-2.5 h-3 w-full rounded-md" />
        <Skeleton className="mb-2.5 h-3 w-11/12 rounded-md" />
        <Skeleton className="h-3 w-3/5 rounded-md" />
      </div>
    </div>
  );
}

export function EventFeedList() {
  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEventFeedQuery();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll. The observer is the only trigger, so a page never loads
  // because of a re-render — `isFetchingNextPage` guards the repeat entry an
  // IntersectionObserver fires while the previous page is still in flight.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <FeedSkeleton />
        <FeedSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-gc-lg border border-dashed border-border bg-card px-5 py-12 text-center">
        <p className="text-sm font-bold">Couldn&rsquo;t load the feed</p>
        <p className="mt-1 text-xs text-gc-ink-muted">
          Refresh the page to try again.
        </p>
      </div>
    );
  }

  const events = data.pages.flatMap((page) => page.items);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-gc-lg border border-dashed border-border bg-card px-5 py-14 text-center">
        <div className="mb-3.5 flex size-12 items-center justify-center rounded-gc-sm bg-muted">
          <List className="size-5 text-gc-ink-muted" aria-hidden="true" />
        </div>
        <p className="text-sm font-extrabold">No events yet</p>
        <p className="mt-1 mb-4 max-w-56 text-xs leading-relaxed text-gc-ink-muted">
          When creators post what they&rsquo;re up to, it&rsquo;ll show here.
        </p>
        <Link
          href="/brand/creators"
          className="inline-flex min-h-10 items-center rounded-full bg-gc-ink px-4 text-[13px] font-bold text-white hover:opacity-90"
        >
          Browse creators
        </Link>
      </div>
    );
  }

  // Posts arrive newest-first, so a heading wherever the day label changes
  // groups them in one pass, with no bucketing step and no sort.
  const dated = events.map((event, i) => {
    const day = eventDayLabel(event.createdAt);
    return {
      event,
      day,
      startsDay: i === 0 || day !== eventDayLabel(events[i - 1].createdAt),
    };
  });

  return (
    <div>
      {dated.map(({ event, day, startsDay: newDay }) => {
        return (
          <Fragment key={event.id}>
            {newDay ? (
              <div className="mb-4 flex items-center gap-3 pt-2 first:pt-0">
                <span className="rounded-full bg-gc-ink px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white">
                  {day}
                </span>
                <span className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>
            ) : null}
            <div className="mb-4">
              <EventFeedCard event={event} />
            </div>
          </Fragment>
        );
      })}

      <div ref={sentinelRef} aria-hidden="true" />

      {isFetchingNextPage ? (
        <div className="flex flex-col gap-4">
          <FeedSkeleton />
          <p className="text-center text-xs font-bold text-gc-muted">
            Loading more…
          </p>
        </div>
      ) : null}

      {!hasNextPage ? (
        <p className="py-4 text-center text-xs font-semibold text-gc-muted-soft">
          That&rsquo;s everything for now.
        </p>
      ) : null}
    </div>
  );
}
