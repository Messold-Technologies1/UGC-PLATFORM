import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type SubmitBriefPayload = {
  orderId: string;
  briefId: string;
};

export async function submitBrief({
  orderId,
  briefId,
}: SubmitBriefPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.SUBMIT_BRIEF(orderId), { briefId });
}
