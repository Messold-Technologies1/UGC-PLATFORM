import { isAxiosError } from "axios";
import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  openBrandDispute,
  type OpenBrandDisputePayload,
} from "../api/open-brand-dispute";

type OpenBrandDisputeMutationOptions = UseMutationOptions<
  void,
  Error,
  OpenBrandDisputePayload,
  unknown
>;

export function useOpenBrandDisputeMutation(
  options?: OpenBrandDisputeMutationOptions,
) {
  return useMutation({
    ...options,
    mutationFn: openBrandDispute,
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
