import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateCreatorPayoutDetailsMe } from "../api/update-creator-payout-details";
import { creatorPayoutDetailsQueryKey } from "../api/fetch-creator-payout-details";
import type { UpsertCreatorPayoutDetailsApi } from "../api/types";

export function useCreatorPayoutDetailsMutation(options?: {
  onSuccess?: () => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertCreatorPayoutDetailsApi) =>
      updateCreatorPayoutDetailsMe(payload),
    onSuccess: (masked) => {
      toast.success("Payout details updated successfully.");
      // The PATCH returns the fresh masked summary, so seed the cache with it
      // before refetching — the UI never shows the pre-save values.
      queryClient.setQueryData(creatorPayoutDetailsQueryKey, masked);
      queryClient.invalidateQueries({
        queryKey: creatorPayoutDetailsQueryKey,
      });
      options?.onSuccess?.();
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update payout details.",
      );
    },
  });
}
