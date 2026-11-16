import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { listMyEvents } from "../api/list-my-events";
import { getMyEventQuota } from "../api/get-my-quota";

export const myEventsQueryKey = ["creator-events", "me"] as const;
export const myEventQuotaQueryKey = ["creator-events", "me", "quota"] as const;

export function useMyEventsQuery() {
  return useInfiniteQuery({
    queryKey: myEventsQueryKey,
    queryFn: ({ pageParam }) =>
      listMyEvents({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}

export function useMyEventQuotaQuery() {
  return useQuery({
    queryKey: myEventQuotaQueryKey,
    queryFn: getMyEventQuota,
    staleTime: 30_000,
  });
}
