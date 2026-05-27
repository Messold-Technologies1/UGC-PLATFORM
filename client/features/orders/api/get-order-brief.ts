import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface OrderBriefAsset {
  key: string;
  url?: string | null;
}

export interface OrderBriefPayload {
  id: string;
  brandName?: string | null;
  brandPronunciationAudio?: OrderBriefAsset | null;
  industry?: string | null;
  brandLogo?: OrderBriefAsset | null;
  productImage?: OrderBriefAsset | null;
  productName?: string | null;
  productDescription?: string | null;
  productPageUrl?: string | null;
  willShipPhysicalProductToCreator: boolean;
  shootLocationKind?: string | null;
  shootLocationAddress?: string | null;
  durationBucket?: string | null;
  contentType?: string[] | null;
  toneStyle?: string[] | null;
  keyNoteToInclude?: string | null;
  ctaNote?: string | null;
  referenceLinks: string[];
  script?: Record<string, unknown> | unknown[] | null;
  finalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderBriefResponse {
  orderId: string;
  briefSubmittedAt?: string | null;
  briefAcceptedAt?: string | null;
  deliveryDaysSnapshot: number;
  requiresPhysicalProductShipment: boolean;
  deliveryDeadlineAt?: string | null;
  brief: OrderBriefPayload | null;
}

export async function getOrderBrief(orderId: string) {
  const { data } = await api.get<OrderBriefResponse>(
    ENDPOINTS.ORDERS.GET_BRIEF(orderId),
  );
  return data;
}
