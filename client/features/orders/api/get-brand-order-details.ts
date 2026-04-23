import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderCreatorSnapshot, OrderDetailsPublic } from "./types";

export interface BrandOrderDetailsResponse {
  order: OrderDetailsPublic;
  creator: OrderCreatorSnapshot;
}

export function brandOrderDetailsQueryKey(orderId: string) {
  return ["orders", "brand", orderId] as const;
}

export async function getBrandOrderDetails(orderId: string) {
  const { data } = await api.get<BrandOrderDetailsResponse>(
    ENDPOINTS.ORDERS.BRAND_DETAIL(orderId),
  );
  return data;
}

export function brandOrderDetailsQueryOptions(orderId: string) {
  return {
    queryKey: brandOrderDetailsQueryKey(orderId),
    queryFn: () => getBrandOrderDetails(orderId),
  };
}
