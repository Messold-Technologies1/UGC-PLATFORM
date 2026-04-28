import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type AcceptOrderDeliveryPayload = {
  orderId: string;
};

export async function acceptOrderDelivery({
  orderId,
}: AcceptOrderDeliveryPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.ACCEPT(orderId));
}
