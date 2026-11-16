import { useInfiniteQuery } from "@tanstack/react-query";
import { listEventFeed } from "../api/list-event-feed";

export const eventFeedQueryKey = ["creator-events", "feed"] as const;

export function useEventFeedQuery() {
  return useInfiniteQuery({
    queryKey: eventFeedQueryKey,
    queryFn: ({ pageParam }) =>
      listEventFeed({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 60_000,
  });
}
