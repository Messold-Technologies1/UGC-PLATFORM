import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderBrandSnapshot, OrderListSummary } from "./types";

export interface CreatorOrderListItem {
  order: OrderListSummary;
  brand: OrderBrandSnapshot;
}

export interface CreatorOrdersListResponse {
  items: CreatorOrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetCreatorOrdersParams {
  page?: number;
  limit?: number;
}

export async function getCreatorOrders(params?: GetCreatorOrdersParams) {
  const { data } = await api.get<CreatorOrdersListResponse>(ENDPOINTS.ORDERS.CREATOR_LIST, {
    params,
  });
  return data;
}
