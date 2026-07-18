import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  withdrawCreatorDispute,
  type WithdrawCreatorDisputePayload,
} from "../api/withdraw-creator-dispute";

type WithdrawCreatorDisputeMutationOptions = UseMutationOptions<
  void,
  Error,
  WithdrawCreatorDisputePayload,
  unknown
>;

export function useWithdrawCreatorDisputeMutation(
  options?: WithdrawCreatorDisputeMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationFn: withdrawCreatorDispute,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders", "creator"] }),
        queryClient.invalidateQueries({
          queryKey: ["orders", "creator", variables.orderId],
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
