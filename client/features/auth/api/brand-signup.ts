import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";
import type {
  BrandCategoryApi,
  BrandProductTypeApi,
} from "@/features/brands/api/brand-category-types";

export type SendSignupPhoneOtpPayload = {
  phone: string;
};

export type PresignBrandSignupUploadPayload = {
  email: string;
  contentType: string;
  contentLength: number;
};

export type PresignBrandSignupUploadResponse = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  cdnUrl: string;
};

export type RegisterBrandPayload = {
  email: string;
  password: string;
  contactFullName: string;
  contactEmail: string;
  contactPhone: string;
  brandName: string;
  logoKey?: string;
  brandPronunciationAudioKey?: string;
  website?: string;
  instagramUrl?: string;
  productType?: BrandProductTypeApi;
  categories?: BrandCategoryApi[];
  otherCategoryLabel?: string;
};

export type RegisterBrandResponse = {
  user: AuthUser;
};

export async function sendSignupPhoneOtp(
  payload: SendSignupPhoneOtpPayload,
): Promise<void> {
  await api.post(ENDPOINTS.AUTH.SIGNUP_PHONE_SEND_OTP, payload);
}

export async function presignBrandSignupLogo(
  payload: PresignBrandSignupUploadPayload,
): Promise<PresignBrandSignupUploadResponse> {
  const { data } = await api.post<PresignBrandSignupUploadResponse>(
    ENDPOINTS.AUTH.SIGNUP_BRAND_LOGO_PRESIGN,
    payload,
  );
  return data;
}

export async function presignBrandSignupPronunciation(
  payload: PresignBrandSignupUploadPayload,
): Promise<PresignBrandSignupUploadResponse> {
  const { data } = await api.post<PresignBrandSignupUploadResponse>(
    ENDPOINTS.AUTH.SIGNUP_BRAND_PRONUNCIATION_PRESIGN,
    payload,
  );
  return data;
}

export async function putBlobToPresignedUrl(
  blob: Blob,
  presign: PresignBrandSignupUploadResponse,
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

export async function registerBrand(
  payload: RegisterBrandPayload,
): Promise<RegisterBrandResponse> {
  const { data } = await api.post<RegisterBrandResponse>(
    ENDPOINTS.AUTH.REGISTER_BRAND,
    payload,
  );
  return data;
}
