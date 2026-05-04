import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignBrandPronunciationUploadPayload = {
  contentType: string;
  contentLength?: number;
};

export type PresignBrandPronunciationUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignBrandPronunciationUpload(
  payload: PresignBrandPronunciationUploadPayload,
): Promise<PresignBrandPronunciationUploadResponse> {
  const { data } = await api.post<PresignBrandPronunciationUploadResponse>(
    ENDPOINTS.BRANDS.PROFILE_PRONUNCIATION_PRESIGN,
    payload,
  );
  return data;
}

export async function putBlobToPresignedUrl(
  blob: Blob,
  presign: PresignBrandPronunciationUploadResponse,
): Promise<void> {
  const res = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: presign.headers,
    body: blob,
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}
