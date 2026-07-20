import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  withdrawBrandDispute,
  type WithdrawBrandDisputePayload,
} from "../api/withdraw-brand-dispute";

type WithdrawBrandDisputeMutationOptions = UseMutationOptions<
  void,
  Error,
  WithdrawBrandDisputePayload,
  unknown
>;

export function useWithdrawBrandDisputeMutation(
  options?: WithdrawBrandDisputeMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: withdrawBrandDispute,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders", "brand"] }),
        queryClient.invalidateQueries({
          queryKey: ["orders", "brand", variables.orderId],
        }),
      ]);
      toast.success("Dispute withdrawn");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to withdraw dispute right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
