import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type DeliveryAssetKind = "video" | "image";

export type PresignDeliveryUploadFile = {
  contentType: string;
  contentLength: number;
  kind: DeliveryAssetKind;
};

export type PresignDeliveryUploadPayload = {
  orderId: string;
  files: PresignDeliveryUploadFile[];
};

export type PresignedDeliveryUploadItem = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export type PresignDeliveryUploadResponse = {
  uploads: PresignedDeliveryUploadItem[];
};

export async function presignDeliveryUpload({
  orderId,
  files,
}: PresignDeliveryUploadPayload): Promise<PresignDeliveryUploadResponse> {
  const { data } = await api.post<PresignDeliveryUploadResponse>(
    ENDPOINTS.ORDERS.DELIVERY_UPLOADS_PRESIGN(orderId),
    { files },
  );
  return data;
}

export async function putDeliveryFileToPresignedUrl(
  file: File,
  presign: PresignedDeliveryUploadItem,
): Promise<void> {
  const res = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: presign.headers,
    body: file,
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}
