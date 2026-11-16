"use client";

import { useMyEventsQuery } from "../hooks/use-my-events-query";

/**
 * "Your posts" plus a live count. Its own client component so the page itself
 * can stay a server component.
 */
export function MyEventsHeading() {
  const { data } = useMyEventsQuery();
  const count = data?.pages.flatMap((page) => page.items).length ?? 0;
  const hasMore = data?.pages.at(-1)?.nextCursor != null;

  return (
    <div className="mb-3.5 flex items-baseline justify-between px-1">
      <h2 className="text-[15px] font-extrabold tracking-tight">Your posts</h2>
      {count > 0 ? (
        <span className="text-xs font-semibold text-gc-muted">
          {count}
          {hasMore ? "+" : ""} post{count === 1 && !hasMore ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}
