import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorRatingReview } from "./types";

export type CreateOrderRatingReviewPayload = {
  orderId: string;
  rating: number;
  review?: string;
};

export type CreateOrderRatingReviewResponse = {
  review: CreatorRatingReview;
  avgRating?: string | null;
  reviewCount: number;
};

export async function getOrderRatingReview(orderId: string) {
  const { data } = await api.get<CreatorRatingReview | null>(
    ENDPOINTS.ORDERS.RATING_REVIEW(orderId),
  );
  return data;
}

export async function createOrderRatingReview({
  orderId,
  rating,
  review,
}: CreateOrderRatingReviewPayload) {
  const { data } = await api.post<CreateOrderRatingReviewResponse>(
    ENDPOINTS.ORDERS.RATING_REVIEW(orderId),
    {
      rating,
      ...(review?.trim() ? { review: review.trim() } : {}),
    },
  );
  return data;
}
