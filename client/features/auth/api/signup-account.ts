import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";

export type RegisterAccountPayload = {
  email: string;
  password: string;
};

/**
 * Creates a role-less account (email + password) via the base register
 * endpoint. The user picks creator/brand on the next step. Tokens are set in
 * HttpOnly cookies; the body returns the user.
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
