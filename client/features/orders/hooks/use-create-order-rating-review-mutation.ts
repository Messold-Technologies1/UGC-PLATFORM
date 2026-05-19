import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createOrderRatingReview,
  type CreateOrderRatingReviewPayload,
  type CreateOrderRatingReviewResponse,
} from "../api/order-rating-review";
import { orderRatingReviewQueryKey } from "./use-get-order-rating-review-query";

type UseCreateOrderRatingReviewMutationOptions = UseMutationOptions<
  CreateOrderRatingReviewResponse,
  Error,
  CreateOrderRatingReviewPayload,
  unknown
>;

export function useCreateOrderRatingReviewMutation(
  options?: UseCreateOrderRatingReviewMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "rating-review", "create"],
    mutationFn: createOrderRatingReview,
    onSuccess: async (data, variables, onMutateResult, context) => {
      queryClient.setQueryData(
        orderRatingReviewQueryKey(variables.orderId),
        data.review,
      );
      await queryClient.invalidateQueries({ queryKey: ["creators"] });
      toast.success("Creator review submitted");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        const message = error.response.data.message;
        toast.error(Array.isArray(message) ? message[0] : String(message));
      } else {
        toast.error("Unable to submit the creator review right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
