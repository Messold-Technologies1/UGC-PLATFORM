import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type OpenBrandDisputePayload = {
  orderId: string;
  reason: string;
};

export async function openBrandDispute({
  orderId,
  reason,
}: OpenBrandDisputePayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.BRAND_DISPUTE(orderId), { reason });
}
