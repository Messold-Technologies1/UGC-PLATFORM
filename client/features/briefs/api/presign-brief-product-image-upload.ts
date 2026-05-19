import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignBriefProductImageUploadPayload = {
  contentType: string;
  contentLength?: number;
};

export type PresignBriefProductImageUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignBriefProductImageUpload(
  payload: PresignBriefProductImageUploadPayload,
): Promise<PresignBriefProductImageUploadResponse> {
  const { data } = await api.post<PresignBriefProductImageUploadResponse>(
    ENDPOINTS.BRIEFS.PRODUCT_IMAGE_PRESIGN,
    payload,
  );
  return data;
}

export async function putProductImageToPresignedUrl(
  file: File,
  presign: PresignBriefProductImageUploadResponse,
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
