import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type AcceptBriefPayload = {
  orderId: string;
};

export async function acceptBrief({
  orderId,
}: AcceptBriefPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.ACCEPT_BRIEF(orderId));
}
