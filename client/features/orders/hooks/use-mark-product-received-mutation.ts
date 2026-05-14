import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  markProductReceived,
  type MarkProductReceivedPayload,
} from "../api/mark-product-received";

type MarkProductReceivedMutationOptions = UseMutationOptions<
  void,
  Error,
  MarkProductReceivedPayload,
  unknown
>;

function getErrorMessage(error: Error) {
  if (isAxiosError(error) && error.response?.data?.message) {
    const message = error.response.data.message;
    return Array.isArray(message) ? message[0] : String(message);
  }

  return "Unable to confirm product receipt right now";
}

export function useMarkProductReceivedMutation(
  options?: MarkProductReceivedMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "product-received"],
    mutationFn: markProductReceived,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Product receipt confirmed");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["orders", "creator", variables.orderId],
        }),
      ]);
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      toast.error(getErrorMessage(error));
      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
