import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderBrandSnapshot {
  id: string; // brand user id
  companyName: string;
  logoUrl?: string | null;
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
