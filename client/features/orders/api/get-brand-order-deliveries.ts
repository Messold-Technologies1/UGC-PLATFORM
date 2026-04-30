import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderDeliveryAsset {
  key: string;
  kind: "video" | "image";
  url: string;
}

export interface OrderDeliveryItem {
  id: string;
  orderId: string;
  creatorId: string;
  revisionsUsed: number;
  assets: OrderDeliveryAsset[];
  note?: string | null;
  createdAt: string;
}

export interface BrandOrderDeliveriesResponse {
  items: OrderDeliveryItem[];
}

export function brandOrderDeliveriesQueryKey(orderId: string) {
  return ["orders", "brand", orderId, "deliveries"] as const;
}

export async function getBrandOrderDeliveries(orderId: string) {
  const { data } = await api.get<BrandOrderDeliveriesResponse>(
    ENDPOINTS.ORDERS.BRAND_DELIVERIES(orderId),
  );
  return data;
}

export function brandOrderDeliveriesQueryOptions(orderId: string) {
  return {
    queryKey: brandOrderDeliveriesQueryKey(orderId),
    queryFn: () => getBrandOrderDeliveries(orderId),
  };
}
