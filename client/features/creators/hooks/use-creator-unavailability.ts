import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clearMyUnavailability,
  fetchMyUnavailability,
  upsertMyUnavailability,
  type UpsertCreatorUnavailabilityPayload,
} from "../api/creator-unavailability";

export const creatorUnavailabilityQueryKey = [
  "creators",
  "profile",
  "me",
  "unavailability",
] as const;

export function useCreatorUnavailabilityQuery(enabled = true) {
  return useQuery({
    queryKey: creatorUnavailabilityQueryKey,
    queryFn: fetchMyUnavailability,
    enabled,
  });
}

export function useUpsertCreatorUnavailabilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertCreatorUnavailabilityPayload) =>
      upsertMyUnavailability(payload),
    onSuccess: () => {
      toast.success("Availability updated");
      void queryClient.invalidateQueries({
        queryKey: creatorUnavailabilityQueryKey,
      });
      void queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
      void fetch("/api/internal/revalidate-creators-list", { method: "POST" });
    },
    onError: () => {
      toast.error("Failed to update availability");
    },
  });
}

export function useClearCreatorUnavailabilityMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearMyUnavailability(),
    onSuccess: () => {
      toast.success("Scheduled dates cleared");
      void queryClient.invalidateQueries({
        queryKey: creatorUnavailabilityQueryKey,
      });
      void queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
      void fetch("/api/internal/revalidate-creators-list", { method: "POST" });
    },
    onError: () => {
      toast.error("Failed to clear availability");
    },
  });
}
