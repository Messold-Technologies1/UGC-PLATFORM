import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignBrandLogoUploadPayload = {
  contentType: string;
  contentLength?: number;
};

export type PresignBrandLogoUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignBrandLogoUpload(
  payload: PresignBrandLogoUploadPayload,
): Promise<PresignBrandLogoUploadResponse> {
  const { data } = await api.post<PresignBrandLogoUploadResponse>(
    ENDPOINTS.BRANDS.PROFILE_LOGO_PRESIGN,
    payload,
  );
  return data;
}

export async function putFileToPresignedUrl(
  file: File,
  presign: PresignBrandLogoUploadResponse,
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

