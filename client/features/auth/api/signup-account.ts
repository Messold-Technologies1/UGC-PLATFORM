import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";

export type RegisterAccountPayload = {
  /** Becomes the user's name — the creator display name / brand contact name. */
  name: string;
  email: string;
  password: string;
  /** E.164 phone verified via OTP at signup (normal email+password flow). */
  phone?: string;
  /** OTP code sent to `phone`; verified server-side at account creation. */
  phoneOtpCode?: string;
};

/**
 * Creates a role-less account (name + email + password) via the base register
 * endpoint. The name carries through to the creator display name or brand
 * contact name once the role is chosen. The user picks creator/brand on the
 * next step. Tokens are set in HttpOnly cookies; the body returns the user.
 */
export async function registerAccount(
  payload: RegisterAccountPayload,
): Promise<AuthUser> {
  const { data } = await api.post<{ user: AuthUser }>(
    ENDPOINTS.AUTH.REGISTER,
    payload,
  );
  return data.user;
}
