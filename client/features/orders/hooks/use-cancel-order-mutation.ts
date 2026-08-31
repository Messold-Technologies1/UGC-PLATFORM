import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { cancelOrder, type CancelOrderPayload } from "../api/cancel-order";

type CancelOrderMutationOptions = UseMutationOptions<
  void,
  Error,
  CancelOrderPayload,
  unknown
>;

export function useCancelOrderMutation(options?: CancelOrderMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "cancel"],
    mutationFn: cancelOrder,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Order cancelled");
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to cancel the order right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
