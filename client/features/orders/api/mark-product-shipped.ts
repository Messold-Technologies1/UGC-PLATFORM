import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type MarkProductShippedPayload = {
  orderId: string;
  courierName: string;
  trackingId?: string;
  dispatchDate: string;
};

export async function markProductShipped({
  orderId,
  courierName,
  trackingId,
  dispatchDate,
}: MarkProductShippedPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.PRODUCT_SHIPMENT(orderId), {
    courierName,
    trackingId,
    dispatchDate,
  });
}
