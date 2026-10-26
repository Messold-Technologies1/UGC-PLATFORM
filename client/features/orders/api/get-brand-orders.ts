import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { OrderCreatorSnapshot, OrderListSummary } from "./types";

export interface BrandOrderListItem {
  order: OrderListSummary;
  creator: OrderCreatorSnapshot;
  /**
   * The agency that placed this order for the brand, when one did. Null for
   * the brand's own orders, which is most of them. The order belongs to the
   * brand either way — this is attribution, not ownership.
   */
  placedByAgencyName?: string | null;
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
