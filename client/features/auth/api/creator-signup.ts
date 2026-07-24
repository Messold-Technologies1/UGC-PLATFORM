import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";

export type SendSignupPhoneOtpPayload = {
  phone: string;
};

export type RegisterCreatorPayload = {
  email: string;
  password: string;
  name: string;
  phone: string;
  phoneOtpCode?: string;
  instagramUrl: string;
  /** Meta attribution cookies captured in the creator's browser at signup,
   * replayed server-side via the Conversions API when the creator is listed. */
  metaFbp?: string;
  metaFbc?: string;
  /** Shared id so the browser + server CreatorRegistration events dedupe. */
  metaSignupEventId?: string;
};

export type RegisterCreatorResponse = {
  user: AuthUser;
};

export async function sendSignupPhoneOtp(
  payload: SendSignupPhoneOtpPayload,
): Promise<void> {
  await api.post(ENDPOINTS.AUTH.SIGNUP_PHONE_SEND_OTP, payload);
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
