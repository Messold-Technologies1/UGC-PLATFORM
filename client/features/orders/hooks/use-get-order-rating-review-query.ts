import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  getOrderRatingReview,
} from "../api/order-rating-review";
import type { CreatorRatingReview } from "../api/types";

export const orderRatingReviewQueryKey = (orderId: string) =>
  ["orders", orderId, "rating-review"] as const;

type UseGetOrderRatingReviewQueryOptions = Omit<
  UseQueryOptions<CreatorRatingReview | null, Error>,
  "queryKey" | "queryFn"
>;

export function useGetOrderRatingReviewQuery(
  orderId: string,
  options?: UseGetOrderRatingReviewQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: orderRatingReviewQueryKey(orderId),
    queryFn: () => getOrderRatingReview(orderId),
    enabled: Boolean(orderId) && (options?.enabled ?? true),
  });
}
