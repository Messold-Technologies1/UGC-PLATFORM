import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type OpenCreatorDisputePayload = {
  orderId: string;
  reason: string;
};

export async function openCreatorDispute({
  orderId,
  reason,
}: OpenCreatorDisputePayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.CREATOR_DISPUTE(orderId), { reason });
}
