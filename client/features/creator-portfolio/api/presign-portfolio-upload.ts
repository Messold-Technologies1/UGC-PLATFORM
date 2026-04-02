import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type PresignPortfolioUploadPayload = {
  kind: "video" | "thumbnail";
  contentType: string;
  contentLength?: number;
};


export type PresignPortfolioUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export async function presignPortfolioUpload(
  payload: PresignPortfolioUploadPayload,
): Promise<PresignPortfolioUploadResponse> {
  const { data } = await api.post<PresignPortfolioUploadResponse>(
    ENDPOINTS.CREATOR_PORTFOLIO.UPLOADS_PRESIGN,
    payload,
  );
  return data;
}


export async function putPortfolioFileToPresignedUrl(
  file: File,
  presign: PresignPortfolioUploadResponse,
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
