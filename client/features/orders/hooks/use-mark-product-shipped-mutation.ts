import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  markProductShipped,
  type MarkProductShippedPayload,
} from "../api/mark-product-shipped";

type MarkProductShippedMutationOptions = UseMutationOptions<
  void,
  Error,
  MarkProductShippedPayload,
  unknown
>;

function getErrorMessage(error: Error) {
  if (isAxiosError(error) && error.response?.data?.message) {
    const message = error.response.data.message;
    return Array.isArray(message) ? message[0] : String(message);
  }

  return "Unable to mark the product as shipped right now";
}

export function useMarkProductShippedMutation(
  options?: MarkProductShippedMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "product-shipment"],
    mutationFn: markProductShipped,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Product shipment marked successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["orders", "brand", variables.orderId],
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
