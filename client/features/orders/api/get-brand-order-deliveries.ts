import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderDeliveryAsset {
  key: string;
  kind: "video" | "image";
  url: string;
  /** True when `url` is the watermarked preview (brand, before accepting). */
  watermarked?: boolean;
  /** Preview generation status; "pending" means it isn't ready yet. */
  previewStatus?: "pending" | "ready" | "failed";
}

export interface OrderDeliveryItem {
  id: string;
  orderId: string;
  creatorId: string;
  revisionsUsed: number;
  assets: OrderDeliveryAsset[];
  note?: string | null;
  /**
   * Brand revision notes this delivery was submitted against.
   * Null for the initial delivery. A pending revision request is not
   * attached here until the creator submits the next video.
   */
  brandRevisionNote?: string | null;
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
