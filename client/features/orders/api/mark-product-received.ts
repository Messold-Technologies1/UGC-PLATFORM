import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type MarkProductReceivedPayload = {
  orderId: string;
};

export async function markProductReceived({
  orderId,
}: MarkProductReceivedPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.PRODUCT_RECEIVED(orderId));
}
