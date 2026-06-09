import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function forgotPassword(email: string): Promise<void> {
  await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.patch(ENDPOINTS.AUTH.CHANGE_PASSWORD, payload);
}
