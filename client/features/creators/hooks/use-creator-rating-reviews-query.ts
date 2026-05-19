import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  listCreatorRatingReviews,
  type ListCreatorRatingReviewsParams,
} from "../api/list-creator-rating-reviews";
import type { ListCreatorRatingReviewsResponse } from "../api/types";

export const creatorRatingReviewsQueryKey = (
  creatorId: string,
  params?: ListCreatorRatingReviewsParams,
) => ["creators", creatorId, "rating-reviews", params ?? {}] as const;

type UseCreatorRatingReviewsQueryOptions = Omit<
  UseQueryOptions<ListCreatorRatingReviewsResponse, Error>,
  "queryKey" | "queryFn"
>;

export function useCreatorRatingReviewsQuery(
  creatorId: string,
  params?: ListCreatorRatingReviewsParams,
  options?: UseCreatorRatingReviewsQueryOptions,
) {
  return useQuery({
    ...options,
    queryKey: creatorRatingReviewsQueryKey(creatorId, params),
    queryFn: () => listCreatorRatingReviews(creatorId, params),
    enabled: Boolean(creatorId) && (options?.enabled ?? true),
    staleTime: options?.staleTime ?? 60_000,
  });
}
