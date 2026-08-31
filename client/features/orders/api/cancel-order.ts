import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CancelOrderPayload = {
  orderId: string;
  note: string;
};

export async function cancelOrder({
  orderId,
  note,
}: CancelOrderPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.CANCEL(orderId), { note });
}
