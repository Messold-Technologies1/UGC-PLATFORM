import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignProfileImageUploadPayload = {
  contentType: string;
  contentLength?: number;
};

/** Matches Nest `PresignUploadResponseDto`. */
export type PresignProfileImageUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignCreatorProfileImageUpload(
  payload: PresignProfileImageUploadPayload,
): Promise<PresignProfileImageUploadResponse> {
  const { data } = await api.post<PresignProfileImageUploadResponse>(
    ENDPOINTS.CREATORS.PROFILE_IMAGE_PRESIGN,
    payload,
  );
  return data;
}

/**
 * PUT the file to the presigned URL using headers from the presign response.
 */
export async function putFileToPresignedUrl(
  file: File,
  presign: PresignProfileImageUploadResponse,
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
