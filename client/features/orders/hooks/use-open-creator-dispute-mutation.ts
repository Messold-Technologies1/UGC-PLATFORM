import { isAxiosError } from "axios";
import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  openCreatorDispute,
  type OpenCreatorDisputePayload,
} from "../api/open-creator-dispute";

type OpenCreatorDisputeMutationOptions = UseMutationOptions<
  void,
  Error,
  OpenCreatorDisputePayload,
  unknown
>;

export function useOpenCreatorDisputeMutation(
  options?: OpenCreatorDisputeMutationOptions,
) {
  return useMutation({
    ...options,
    mutationFn: openCreatorDispute,
    onSuccess: (data, variables, onMutateResult, context) => {
      toast.success("Dispute submitted successfully");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to submit dispute right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
