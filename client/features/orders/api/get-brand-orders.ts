import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderCreatorSnapshot, OrderListSummary } from "./types";

export interface BrandOrderListItem {
  order: OrderListSummary;
  creator: OrderCreatorSnapshot;
}

export interface BrandOrdersListResponse {
  items: BrandOrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface GetBrandOrdersParams {
  page?: number;
  limit?: number;
  /** Filter by order lifecycle status, e.g. "BRIEF_SUBMISSION_PENDING". */
  status?: string;
}

export async function getBrandOrders(params?: GetBrandOrdersParams) {
  const { data } = await api.get<BrandOrdersListResponse>(ENDPOINTS.ORDERS.BRAND_LIST, {
    params,
  });
  return data;
}
