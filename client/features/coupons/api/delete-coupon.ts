import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function deleteCoupon(id: string): Promise<void> {
  await api.delete(ENDPOINTS.ADMIN.COUPONS.DELETE(id));
}
