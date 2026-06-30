import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { DeliveryAssetKind } from "./presign-delivery-upload";

export type SubmitDeliveryAsset = {
  key: string;
  kind: DeliveryAssetKind;
  sha256?: string;
};

export type SubmitDeliveryPayload = {
  orderId: string;
  assets: SubmitDeliveryAsset[];
  note?: string;
};

export type SubmitDeliveryResponse = {
  orderId: string;
  revisionNumber: number;
  status: string;
};

export async function submitDelivery({
  orderId,
  assets,
  note,
}: SubmitDeliveryPayload): Promise<SubmitDeliveryResponse> {
  const { data } = await api.post<SubmitDeliveryResponse>(
    ENDPOINTS.ORDERS.SUBMIT_DELIVERY(orderId),
    { assets, note },
  );
  return data;
}
