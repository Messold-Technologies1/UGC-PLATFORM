import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderDeliveryAsset } from "./get-brand-order-deliveries";

export interface CreatorDeliveryOrderSnapshot {
  id: string;
  status: string;
  brandName: string;
  brandLogoUrl?: string | null;
}

export interface CreatorDeliveryItem {
  id: string;
  orderId: string;
  revisionNumber: number;
  assets: OrderDeliveryAsset[];
  note?: string | null;
  createdAt: string;
  order: CreatorDeliveryOrderSnapshot;
}

export interface CreatorDeliveriesResponse {
  items: CreatorDeliveryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetCreatorDeliveriesParams {
  page?: number;
  limit?: number;
}

export function creatorDeliveriesQueryKey(
  params?: GetCreatorDeliveriesParams,
) {
  return [
    "orders",
    "creator",
    "deliveries",
    params?.page ?? 1,
    params?.limit ?? 20,
  ] as const;
}

export function creatorOrderDeliveriesQueryKey(orderId: string) {
  return ["orders", "creator", orderId, "deliveries"] as const;
}

export async function getCreatorDeliveries(
  params?: GetCreatorDeliveriesParams,
) {
  const { data } = await api.get<CreatorDeliveriesResponse>(
    ENDPOINTS.ORDERS.CREATOR_DELIVERIES,
    { params },
  );
  return data;
}

export async function getCreatorOrderDeliveries(orderId: string) {
  const limit = 50;
  let page = 1;
  const items: CreatorDeliveryItem[] = [];

  while (true) {
    const data = await getCreatorDeliveries({ page, limit });
    items.push(...data.items);

    if (page * data.limit >= data.total || data.items.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    items: items
      .filter((item) => item.orderId === orderId)
      .sort((a, b) => {
        if (a.revisionNumber !== b.revisionNumber) {
          return a.revisionNumber - b.revisionNumber;
        }

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
  };
}

export function creatorDeliveriesQueryOptions(
  params?: GetCreatorDeliveriesParams,
) {
  return {
    queryKey: creatorDeliveriesQueryKey(params),
    queryFn: () => getCreatorDeliveries(params),
  };
}

export function creatorOrderDeliveriesQueryOptions(orderId: string) {
  return {
    queryKey: creatorOrderDeliveriesQueryKey(orderId),
    queryFn: () => getCreatorOrderDeliveries(orderId),
  };
}
