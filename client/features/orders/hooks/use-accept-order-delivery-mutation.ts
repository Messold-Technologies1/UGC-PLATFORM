import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  acceptOrderDelivery,
  type AcceptOrderDeliveryPayload,
} from "../api/accept-order-delivery";

type AcceptOrderDeliveryMutationOptions = UseMutationOptions<
  void,
  Error,
  AcceptOrderDeliveryPayload,
  unknown
>;

export function useAcceptOrderDeliveryMutation(
  options?: AcceptOrderDeliveryMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "accept-delivery"],
    mutationFn: acceptOrderDelivery,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Delivery approved successfully");
      await queryClient.invalidateQueries({ queryKey: ["orders", "brand"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to approve the delivery right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
