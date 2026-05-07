import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type SendPhoneOtpPayload = {
  phone: string;
};

export type VerifyPhoneOtpPayload = {
  phone: string;
  code: string;
};

export type VerifyPhoneOtpResponse = {
  status: string;
  phoneVerified: boolean;
};

export async function sendPhoneOtp(
  payload: SendPhoneOtpPayload,
): Promise<void> {
  await api.post(ENDPOINTS.AUTH.PHONE_SEND_OTP, payload);
}

export async function verifyPhoneOtp(
  payload: VerifyPhoneOtpPayload,
): Promise<VerifyPhoneOtpResponse> {
  const { data } = await api.post<VerifyPhoneOtpResponse>(
    ENDPOINTS.AUTH.PHONE_VERIFY_OTP,
    payload,
  );
  return data;
}
