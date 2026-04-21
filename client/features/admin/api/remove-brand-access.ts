import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function removeBrandAccess(userId: string): Promise<void> {
  await api.delete(ENDPOINTS.ADMIN.BRANDS.REMOVE(userId));
}
