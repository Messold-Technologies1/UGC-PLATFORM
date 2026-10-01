import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type SendPhoneOtpPayload = {
  phone: string;
};

/**
 * Which channel the code went out on. Each resend steps one rung down the
 * ladder (WhatsApp -> SMS -> Twilio Verify), so the UI has to tell the user
 * where to look rather than assuming WhatsApp.
 */
export type PhoneOtpChannel = "whatsapp" | "sms" | "twilio_verify";

export type SendPhoneOtpResult = {
  channel: PhoneOtpChannel;
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
): Promise<SendPhoneOtpResult> {
  const { data } = await api.post<SendPhoneOtpResult>(
    ENDPOINTS.AUTH.PHONE_SEND_OTP,
    payload,
  );
  return data;
}

/**
 * Send an OTP during signup (unauthenticated). The code is verified server-side
 * when the account is created (POST /auth/register with phone + phoneOtpCode).
 */
export async function sendSignupPhoneOtp(
  payload: SendPhoneOtpPayload,
): Promise<SendPhoneOtpResult> {
  const { data } = await api.post<SendPhoneOtpResult>(
    ENDPOINTS.AUTH.SIGNUP_PHONE_SEND_OTP,
    payload,
  );
  return data;
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
