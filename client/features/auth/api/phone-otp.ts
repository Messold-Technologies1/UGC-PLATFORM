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

/**
 * Send an OTP during signup (unauthenticated). The code is verified server-side
 * when the account is created (POST /auth/register with phone + phoneOtpCode).
 */
export async function sendSignupPhoneOtp(
  payload: SendPhoneOtpPayload,
): Promise<void> {
  await api.post(ENDPOINTS.AUTH.SIGNUP_PHONE_SEND_OTP, payload);
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

/**
 * Delivery outcome of the last code sent to a number.
 *
 * The send call cannot tell us this: WhatsApp accepts (queues) a message even
 * for a number with no WhatsApp account, and the real verdict reaches our
 * webhook seconds later. The UI checks here once its resend countdown lapses,
 * so it can tell the user their number isn't on WhatsApp rather than leaving
 * them waiting for a code that will never arrive.
 */
export type PhoneOtpStatus = {
  status: "unknown" | "pending" | "delivered" | "failed";
  notOnWhatsApp: boolean;
};

export async function fetchPhoneOtpStatus(
  phone: string,
): Promise<PhoneOtpStatus> {
  const { data } = await api.get<PhoneOtpStatus>(
    ENDPOINTS.AUTH.PHONE_OTP_STATUS,
    { params: { phone } },
  );
  return data;
}

export async function fetchSignupPhoneOtpStatus(
  phone: string,
): Promise<PhoneOtpStatus> {
  const { data } = await api.get<PhoneOtpStatus>(
    ENDPOINTS.AUTH.SIGNUP_PHONE_OTP_STATUS,
    { params: { phone } },
  );
  return data;
}
