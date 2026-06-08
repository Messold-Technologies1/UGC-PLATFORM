import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";

export type SendSignupPhoneOtpPayload = {
  phone: string;
};

export type PresignCreatorPortfolioVideoPayload = {
  email: string;
  contentType: string;
  contentLength: number;
};

export type PresignCreatorPortfolioVideoResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export type RegisterCreatorPayload = {
  email: string;
  password: string;
  name: string;
  phone: string;
  phoneOtpCode?: string;
  age: number;
  gender: "MALE" | "FEMALE" | "OTHER";
  city: string;
  state: string;
  country: string;
  bio?: string;
  instagramUrl?: string;
  driveLink?: string;
  categorySlugs: string[];
  portfolioSignupVideoTempKeys?: string[];
};

export type RegisterCreatorResponse = {
  user: AuthUser;
};

export async function sendSignupPhoneOtp(
  payload: SendSignupPhoneOtpPayload,
): Promise<void> {
  await api.post(ENDPOINTS.AUTH.SIGNUP_PHONE_SEND_OTP, payload);
}

export async function presignCreatorPortfolioVideo(
  payload: PresignCreatorPortfolioVideoPayload,
): Promise<PresignCreatorPortfolioVideoResponse> {
  const { data } = await api.post<PresignCreatorPortfolioVideoResponse>(
    ENDPOINTS.AUTH.SIGNUP_CREATOR_PORTFOLIO_VIDEO_PRESIGN,
    payload,
  );
  return data;
}

export async function putFileToPresignedUrl(
  file: Blob,
  presign: PresignCreatorPortfolioVideoResponse,
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

export async function registerCreator(
  payload: RegisterCreatorPayload,
): Promise<RegisterCreatorResponse> {
  const { data } = await api.post<RegisterCreatorResponse>(
    ENDPOINTS.AUTH.REGISTER_CREATOR,
    payload,
  );
  return data;
}
