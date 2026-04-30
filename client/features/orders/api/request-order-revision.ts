import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type RequestOrderRevisionPayload = {
  orderId: string;
};

export async function requestOrderRevision({
  orderId,
}: RequestOrderRevisionPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.REQUEST_REVISION(orderId));
}
