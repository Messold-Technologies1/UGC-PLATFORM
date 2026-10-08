"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  fetchNotificationPreferences,
  notificationPreferencesQueryKey,
  updateNotificationPreferences,
  type NotificationPreferences,
  type UpdateNotificationPreferencesPayload,
} from "../api/notification-preferences";

export function useNotificationPreferencesQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: notificationPreferencesQueryKey,
    queryFn: fetchNotificationPreferences,
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60_000,
    retry: false,
  });
}

/**
 * Saves a toggle the moment it is flipped — there is no Save button, so the
 * switch moves optimistically and rolls back if the request fails. Without the
 * rollback a failed save leaves the switch showing a preference the server
 * never stored, which is the one thing a notification setting must not do.
 */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateNotificationPreferences,
    onMutate: async (payload: UpdateNotificationPreferencesPayload) => {
      await queryClient.cancelQueries({
        queryKey: notificationPreferencesQueryKey,
      });
      const previous = queryClient.getQueryData<NotificationPreferences>(
        notificationPreferencesQueryKey,
      );
      if (previous) {
        queryClient.setQueryData<NotificationPreferences>(
          notificationPreferencesQueryKey,
          { ...previous, ...payload },
        );
      }
      return { previous };
    },
    onError: (error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          notificationPreferencesQueryKey,
          context.previous,
        );
      }
      const message = isAxiosError(error)
        ? error.response?.data?.message
        : null;
      toast.error(
        typeof message === "string" && message.trim()
          ? message
          : "Could not save your notification preferences. Try again.",
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(notificationPreferencesQueryKey, updated);
    },
  });
}
