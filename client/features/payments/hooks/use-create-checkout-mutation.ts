import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import {
  createCheckout,
  type CheckoutSession,
  type CreateCheckoutPayload,
} from "../api/create-checkout";

type CreateCheckoutMutationOptions = UseMutationOptions<
  CheckoutSession,
  Error,
  CreateCheckoutPayload,
  unknown
>;

export function useCreateCheckoutMutation(
  options?: CreateCheckoutMutationOptions,
) {
  return useMutation({
    ...options,
    mutationKey: ["payments", "create-checkout"],
    mutationFn: createCheckout,
  });
}
