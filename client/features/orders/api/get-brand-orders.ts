import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderCreatorSnapshot {
  id: string;
  displayName: string;
  profileImageUrl?: string | null;
  city?: string | null;
}

export interface OrderListSummary {
  id: string;
  status: string;
  packageNameSnapshot: string;
  priceAmountSnapshot: string;
  currency: string;
  deliveryDaysSnapshot: number;
  paidAt?: string | null;
  briefSubmittedAt?: string | null;
  hasBrief: boolean;
  deliveryDeadlineAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

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
}

export async function getBrandOrders(params?: GetBrandOrdersParams) {
  const { data } = await api.get<BrandOrdersListResponse>(ENDPOINTS.ORDERS.BRAND_LIST, {
    params,
  });
  return data;
}
