import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { ListCreatorRatingReviewsResponse } from "./types";

export type ListCreatorRatingReviewsParams = {
  page?: number;
  limit?: number;
};

export async function listCreatorRatingReviews(
  creatorId: string,
  params?: ListCreatorRatingReviewsParams,
) {
  const { data } = await api.get<ListCreatorRatingReviewsResponse>(
    ENDPOINTS.CREATORS.RATING_REVIEWS(creatorId),
    { params },
  );
  return data;
}
