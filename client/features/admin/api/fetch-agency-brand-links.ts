import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/**
 * Support oversight of who manages whom.
 *
 * Read-mostly: admins can see every link and end one, but deliberately cannot
 * create one. Brand consent (redeeming the code) and agency consent (accepting
 * it) are the safety property, and an admin-made link would bypass both.
 */

export type AdminAgencyBrandLinkStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "REVOKED";

export interface AdminAgencyBrandLink {
  id: string;
  status: AdminAgencyBrandLinkStatus;
  requestedAt: string;
  respondedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  agency: { id: string; name: string; contactEmail: string };
  brand: { id: string; brandName: string | null };
}

export async function fetchAgencyBrandLinks(params?: {
  agencyId?: string;
  brandId?: string;
}): Promise<AdminAgencyBrandLink[]> {
  const { data } = await api.get<AdminAgencyBrandLink[]>(
    ENDPOINTS.ADMIN.AGENCY_BRAND_LINKS.LIST,
    { params },
  );
  return data;
}

export async function forceUnlinkAgencyBrand(
  id: string,
  reason?: string,
): Promise<void> {
  await api.post(ENDPOINTS.ADMIN.AGENCY_BRAND_LINKS.FORCE_UNLINK(id), {
    reason,
  });
}
