import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type AttachBriefToOrderPayload = {
  briefId: string;
  orderId: string;
};

export async function attachBriefToOrder({
  briefId,
  orderId,
}: AttachBriefToOrderPayload): Promise<void> {
  await api.post(ENDPOINTS.BRIEFS.ATTACH_TO_ORDER(briefId), { orderId });
}
