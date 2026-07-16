import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { MultipartCompletedPart } from "@/lib/s3-multipart-upload";

type CreateResponse = {
  key: string;
  uploadId: string;
  cdnUrl: string;
  partSizeBytes: number;
  expiresInSeconds: number;
};

export async function createSignupVideoMultipart(payload: {
  email: string;
  contentType: string;
  contentLength: number;
}): Promise<CreateResponse> {
  const { data } = await api.post<CreateResponse>(
    ENDPOINTS.AUTH.SIGNUP_CREATOR_PORTFOLIO_VIDEO_MULTIPART_CREATE,
    payload,
  );
  return data;
}

export async function signSignupVideoPart(payload: {
  email: string;
  key: string;
  uploadId: string;
  partNumber: number;
}): Promise<string> {
  const { data } = await api.post<{ url: string }>(
    ENDPOINTS.AUTH.SIGNUP_CREATOR_PORTFOLIO_VIDEO_MULTIPART_SIGN_PART,
    payload,
  );
  return data.url;
}

export async function completeSignupVideoMultipart(payload: {
  email: string;
  key: string;
  uploadId: string;
  parts: MultipartCompletedPart[];
}): Promise<{ key: string; cdnUrl: string }> {
  const { data } = await api.post<{ key: string; cdnUrl: string }>(
    ENDPOINTS.AUTH.SIGNUP_CREATOR_PORTFOLIO_VIDEO_MULTIPART_COMPLETE,
    payload,
  );
  return data;
}

export async function abortSignupVideoMultipart(payload: {
  email: string;
  key: string;
  uploadId: string;
}): Promise<void> {
  await api.post(
    ENDPOINTS.AUTH.SIGNUP_CREATOR_PORTFOLIO_VIDEO_MULTIPART_ABORT,
    payload,
  );
}
