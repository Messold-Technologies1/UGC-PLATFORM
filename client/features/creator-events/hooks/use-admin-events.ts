import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  hideAdminEvent,
  listAdminEvents,
  unhideAdminEvent,
} from "../api/admin-events";
import type { AdminEventStatus } from "../api/types";
import { eventErrorMessage } from "../lib/event-error-message";

export const adminEventsQueryKey = (
  status: AdminEventStatus,
  search: string,
) => ["creator-events", "admin", status, search] as const;

export function useAdminEventsQuery(input: {
  status: AdminEventStatus;
  search: string;
}) {
  return useInfiniteQuery({
    queryKey: adminEventsQueryKey(input.status, input.search),
    queryFn: ({ pageParam }) =>
      listAdminEvents({
        cursor: pageParam as string | undefined,
        status: input.status,
        search: input.search || undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

/**
 * Hiding moves a post between the Visible and Hidden tabs and changes both
 * counts, so every admin list is refreshed rather than the current tab alone.
 */
function useRefreshAdminEvents() {
  const queryClient = useQueryClient();
  return () =>
    void queryClient.invalidateQueries({
      queryKey: ["creator-events", "admin"],
    });
}

export function useHideEventMutation() {
  const refresh = useRefreshAdminEvents();
  return useMutation({
    mutationFn: hideAdminEvent,
    onSuccess: () => {
      refresh();
      toast.success("Post hidden");
    },
    onError: (error) => toast.error(eventErrorMessage(error, "Couldn't hide it")),
  });
}

export function useUnhideEventMutation() {
  const refresh = useRefreshAdminEvents();
  return useMutation({
    mutationFn: unhideAdminEvent,
    onSuccess: () => {
      refresh();
      toast.success("Post is visible again");
    },
    onError: (error) =>
      toast.error(eventErrorMessage(error, "Couldn't unhide it")),
  });
}
