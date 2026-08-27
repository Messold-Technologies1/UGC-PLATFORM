import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type AttachBriefToOrderResultStatus = "SUBMITTED" | "SKIPPED" | "FAILED";

export interface AttachBriefToOrderResult {
  orderId: string;
  status: AttachBriefToOrderResultStatus;
  message?: string | null;
}

export interface AttachBriefToOrdersResponse {
  results: AttachBriefToOrderResult[];
  submittedCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface AttachBriefToOrdersPayload {
  briefId: string;
  orderIds: string[];
}

export async function attachBriefToOrders({
  briefId,
  orderIds,
}: AttachBriefToOrdersPayload): Promise<AttachBriefToOrdersResponse> {
  const { data } = await api.post<AttachBriefToOrdersResponse>(
    ENDPOINTS.BRIEFS.ATTACH_TO_ORDERS(briefId),
    { orderIds },
  );
  return data;
}
