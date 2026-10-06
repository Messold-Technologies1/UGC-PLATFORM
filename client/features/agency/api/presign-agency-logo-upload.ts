import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignAgencyLogoUploadPayload = {
  contentType: string;
  contentLength?: number;
};

export type PresignAgencyLogoUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignAgencyLogoUpload(
  payload: PresignAgencyLogoUploadPayload,
): Promise<PresignAgencyLogoUploadResponse> {
  const { data } = await api.post<PresignAgencyLogoUploadResponse>(
    ENDPOINTS.AGENCY.PROFILE_LOGO_PRESIGN,
    payload,
  );
  return data;
}
