import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type RequestOrderRevisionPayload = {
  orderId: string;
  note?: string;
};

export async function requestOrderRevision({
  orderId,
  note,
}: RequestOrderRevisionPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.REQUEST_REVISION(orderId), { note });
}
