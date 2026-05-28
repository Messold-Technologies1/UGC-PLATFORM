import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignProfileIntroVideoUploadPayload = {
  contentType: string;
  contentLength?: number;
  /** Required for admin uploads; optional for profile owner (resolved from JWT). */
  creatorProfileId?: string;
};

export type PresignProfileIntroVideoUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignCreatorProfileIntroVideoUpload(
  payload: PresignProfileIntroVideoUploadPayload,
): Promise<PresignProfileIntroVideoUploadResponse> {
  const { data } = await api.post<PresignProfileIntroVideoUploadResponse>(
    ENDPOINTS.CREATORS.PROFILE_INTRO_VIDEO_PRESIGN,
    payload,
  );
  return data;
}

export async function putIntroVideoToPresignedUrl(
  file: File,
  presign: PresignProfileIntroVideoUploadResponse,
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
