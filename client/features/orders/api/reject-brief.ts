import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type RejectBriefPayload = {
  orderId: string;
  note: string;
};

export async function rejectBrief({
  orderId,
  note,
}: RejectBriefPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.REJECT_BRIEF(orderId), { note });
}
