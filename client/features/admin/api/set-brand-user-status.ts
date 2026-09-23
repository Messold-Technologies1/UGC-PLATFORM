import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type BrandUserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type BrandUserStatusResponse = {
  userId: string;
  status: BrandUserStatus;
};

/**
 * Deactivating blocks the brand user's login and every workspace guard without
 * deleting anything, so activating again fully restores their access.
 */
export async function setBrandUserActive(
  userId: string,
  active: boolean,
): Promise<BrandUserStatusResponse> {
  const url = active
    ? ENDPOINTS.ADMIN.BRANDS.ACTIVATE(userId)
    : ENDPOINTS.ADMIN.BRANDS.DEACTIVATE(userId);
  const { data } = await api.patch<BrandUserStatusResponse>(url);
  return data;
}
