import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createEvent } from "../api/create-event";
import { updateEvent } from "../api/update-event";
import { deleteEvent } from "../api/delete-event";
import { myEventQuotaQueryKey, myEventsQueryKey } from "./use-my-events-query";
import { eventErrorMessage } from "../lib/event-error-message";

/**
 * The creator's own list and the daily-quota counter both move on every write,
 * so each mutation refreshes the pair. The BRAND feed is deliberately not
 * touched from here: it lives in another session, and refetch-on-focus picks
 * a new post up there soon enough.
 */
function useRefreshMyEvents() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: myEventsQueryKey });
    void queryClient.invalidateQueries({ queryKey: myEventQuotaQueryKey });
  };
}

export function useCreateEventMutation() {
  const refresh = useRefreshMyEvents();
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => {
      refresh();
      toast.success("Posted");
    },
    onError: (error) => toast.error(eventErrorMessage(error, "Couldn't post that")),
  });
}

export function useUpdateEventMutation() {
  const refresh = useRefreshMyEvents();
  return useMutation({
    mutationFn: updateEvent,
    onSuccess: () => {
      refresh();
      toast.success("Post updated");
    },
    onError: (error) => toast.error(eventErrorMessage(error, "Couldn't save that")),
  });
}

export function useDeleteEventMutation() {
  const refresh = useRefreshMyEvents();
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      refresh();
      toast.success("Post deleted");
    },
    onError: (error) =>
      toast.error(eventErrorMessage(error, "Couldn't delete that")),
  });
}
