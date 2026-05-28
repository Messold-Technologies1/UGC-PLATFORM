import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { PortfolioApiRequestOptions } from "./types";

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
  options?: PortfolioApiRequestOptions,
): Promise<PresignPortfolioUploadResponse> {
  const endpoint = options?.adminCreatorId
    ? ENDPOINTS.ADMIN.CREATORS.PORTFOLIO_UPLOADS_PRESIGN(options.adminCreatorId)
    : ENDPOINTS.CREATOR_PORTFOLIO.UPLOADS_PRESIGN;

  const { data } = await api.post<PresignPortfolioUploadResponse>(
    endpoint,
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
