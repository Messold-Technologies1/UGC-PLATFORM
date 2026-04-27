import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderBrandSnapshot, OrderDetailsPublic } from "./types";

export interface CreatorOrderDetailsResponse {
  order: OrderDetailsPublic;
  brand: OrderBrandSnapshot;
}

export function creatorOrderDetailsQueryKey(orderId: string) {
  return ["orders", "creator", orderId] as const;
}

export async function getCreatorOrderDetails(orderId: string) {
  const { data } = await api.get<CreatorOrderDetailsResponse>(
    ENDPOINTS.ORDERS.CREATOR_DETAIL(orderId),
  );
  return data;
}

export function creatorOrderDetailsQueryOptions(orderId: string) {
  return {
    queryKey: creatorOrderDetailsQueryKey(orderId),
    queryFn: () => getCreatorOrderDetails(orderId),
  };
}
