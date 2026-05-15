import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderBriefResponse {
  orderId: string;
  briefSubmittedAt?: string | null;
  briefAcceptedAt?: string | null;
  deliveryDaysSnapshot: number;
  requiresPhysicalProductShipment: boolean;
  deliveryDeadlineAt?: string | null;
  brief: Record<string, unknown> | null;
}

export async function getOrderBrief(orderId: string) {
  const { data } = await api.get<OrderBriefResponse>(
    ENDPOINTS.ORDERS.GET_BRIEF(orderId),
  );
  return data;
}
