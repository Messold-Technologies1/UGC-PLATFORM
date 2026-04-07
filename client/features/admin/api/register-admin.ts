import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export interface RegisterAdminPayload {
  name?: string;
  email: string;
  password: string;
}

export async function registerAdmin(payload: RegisterAdminPayload) {
  const { data } = await api.post(ENDPOINTS.AUTH.REGISTER_ADMIN, payload);
  return data;
}
