import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { MultipartCompletedPart } from "@/lib/s3-multipart-upload";
import type { DeliveryAssetKind } from "./presign-delivery-upload";

export type CreateDeliveryMultipartResponse = {
  key: string;
  uploadId: string;
  cdnUrl: string;
  partSizeBytes: number;
  expiresInSeconds: number;
};

export async function createDeliveryMultipartUpload(
  orderId: string,
  payload: {
    contentType: string;
    contentLength: number;
    kind: DeliveryAssetKind;
  },
): Promise<CreateDeliveryMultipartResponse> {
  const { data } = await api.post<CreateDeliveryMultipartResponse>(
    ENDPOINTS.ORDERS.DELIVERY_UPLOADS_MULTIPART_CREATE(orderId),
    payload,
  );
  return data;
}

export async function signDeliveryMultipartPart(
  orderId: string,
  payload: { key: string; uploadId: string; partNumber: number },
): Promise<string> {
  const { data } = await api.post<{ url: string }>(
    ENDPOINTS.ORDERS.DELIVERY_UPLOADS_MULTIPART_SIGN_PART(orderId),
    payload,
  );
  return data.url;
}

export async function completeDeliveryMultipartUpload(
  orderId: string,
  payload: { key: string; uploadId: string; parts: MultipartCompletedPart[] },
): Promise<{ key: string; cdnUrl: string }> {
  const { data } = await api.post<{ key: string; cdnUrl: string }>(
    ENDPOINTS.ORDERS.DELIVERY_UPLOADS_MULTIPART_COMPLETE(orderId),
    payload,
  );
  return data;
}

export async function abortDeliveryMultipartUpload(
  orderId: string,
  payload: { key: string; uploadId: string },
): Promise<void> {
  await api.post(
    ENDPOINTS.ORDERS.DELIVERY_UPLOADS_MULTIPART_ABORT(orderId),
    payload,
  );
}
