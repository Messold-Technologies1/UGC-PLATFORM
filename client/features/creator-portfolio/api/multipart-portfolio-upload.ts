import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { MultipartCompletedPart } from "@/lib/s3-multipart-upload";
import type { PortfolioApiRequestOptions } from "./types";

type CreateMultipartResponse = {
  key: string;
  uploadId: string;
  cdnUrl: string;
  partSizeBytes: number;
  expiresInSeconds: number;
};

function withCreator<T extends object>(
  payload: T,
  options?: PortfolioApiRequestOptions,
): T & { creatorId?: string } {
  return options?.adminCreatorId
    ? { ...payload, creatorId: options.adminCreatorId }
    : payload;
}

export async function createPortfolioMultipartUpload(
  payload: {
    kind: "video" | "thumbnail";
    contentType: string;
    contentLength: number;
    /** SHA-256 hex, when the file was small enough to hash. */
    contentHash?: string;
  },
  options?: PortfolioApiRequestOptions,
): Promise<CreateMultipartResponse> {
  const { data } = await api.post<CreateMultipartResponse>(
    ENDPOINTS.CREATOR_PORTFOLIO.UPLOADS_MULTIPART_CREATE,
    withCreator(payload, options),
  );
  return data;
}

export async function signPortfolioMultipartPart(
  payload: { key: string; uploadId: string; partNumber: number },
  options?: PortfolioApiRequestOptions,
): Promise<string> {
  const { data } = await api.post<{ url: string }>(
    ENDPOINTS.CREATOR_PORTFOLIO.UPLOADS_MULTIPART_SIGN_PART,
    withCreator(payload, options),
  );
  return data.url;
}

export async function completePortfolioMultipartUpload(
  payload: { key: string; uploadId: string; parts: MultipartCompletedPart[] },
  options?: PortfolioApiRequestOptions,
): Promise<{ key: string; cdnUrl: string }> {
  const { data } = await api.post<{ key: string; cdnUrl: string }>(
    ENDPOINTS.CREATOR_PORTFOLIO.UPLOADS_MULTIPART_COMPLETE,
    withCreator(payload, options),
  );
  return data;
}

export async function abortPortfolioMultipartUpload(
  payload: { key: string; uploadId: string },
  options?: PortfolioApiRequestOptions,
): Promise<void> {
  await api.post(
    ENDPOINTS.CREATOR_PORTFOLIO.UPLOADS_MULTIPART_ABORT,
    withCreator(payload, options),
  );
}
