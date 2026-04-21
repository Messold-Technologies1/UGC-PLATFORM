import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type SubmitBriefPayload = {
  orderId: string;
  brief: Record<string, unknown>;
};

export async function submitBrief({
  orderId,
  brief,
}: SubmitBriefPayload): Promise<void> {
  await api.post(ENDPOINTS.ORDERS.SUBMIT_BRIEF(orderId), { brief });
}
