import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/**
 * Partner links, both sides.
 *
 * Worth keeping the direction in mind while reading: the AGENCY holds the
 * partner code, the BRAND redeems it to create a PENDING request, and the
 * AGENCY accepts. So the brand calls `requestAgencyLink` and the agency calls
 * `acceptBrandLink` — not the other way round.
 */

export type AgencyBrandLinkStatus =
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "REVOKED";

/** Everything the brand profile is still missing before it may connect anyone. */
export type BrandCompletenessGap =
  | "BRAND_NAME_MISSING"
  | "CONTACT_NAME_MISSING"
  | "CONTACT_PHONE_MISSING"
  | "PHONE_NOT_VERIFIED";

export type BrandCompleteness = {
  complete: boolean;
  gaps: BrandCompletenessGap[];
};

/** A link as the brand sees it — the agency is on the other end. */
export type BrandAgencyLink = {
  id: string;
  status: AgencyBrandLinkStatus;
  requestedAt: string;
  respondedAt: string | null;
  agencyId: string;
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyContactEmail: string;
};

/** A link as the agency sees it — the brand is on the other end. */
export type AgencyBrandLink = {
  id: string;
  status: AgencyBrandLinkStatus;
  requestedAt: string;
  respondedAt: string | null;
  brandId: string;
  brandName: string | null;
  brandLogoUrl: string | null;
};

export type AgencyPartnerId = {
  partnerId: string;
  issuedAt: string | null;
  rotatedAt: string | null;
};

export type AgencySpendReport = {
  brandId: string;
  orderCount: number;
  /** Covered by the brand's own wallet credit. */
  creditsAppliedPaise: number;
  /** Total order value; the part beyond credits is what was paid at checkout. */
  chargedPaise: number;
};

// ---------------------------------------------------------------- agency side

export async function fetchAgencyPartnerId(): Promise<AgencyPartnerId> {
  const { data } = await api.get<AgencyPartnerId>(ENDPOINTS.AGENCY.PARTNER_ID);
  return data;
}

export async function rotateAgencyPartnerId(): Promise<{ partnerId: string }> {
  const { data } = await api.post<{ partnerId: string }>(
    ENDPOINTS.AGENCY.PARTNER_ID_ROTATE,
  );
  return data;
}

export async function fetchAgencyBrandLinks(): Promise<AgencyBrandLink[]> {
  const { data } = await api.get<AgencyBrandLink[]>(
    ENDPOINTS.AGENCY.BRAND_LINKS,
  );
  return data;
}

export async function acceptBrandLink(id: string): Promise<void> {
  await api.post(ENDPOINTS.AGENCY.BRAND_LINK_ACCEPT(id));
}

export async function rejectBrandLink(id: string): Promise<void> {
  await api.post(ENDPOINTS.AGENCY.BRAND_LINK_REJECT(id));
}

export async function leaveBrandLink(id: string): Promise<void> {
  await api.delete(ENDPOINTS.AGENCY.BRAND_LINK_LEAVE(id));
}

export async function fetchAgencySpendReport(
  brandId: string,
): Promise<AgencySpendReport> {
  const { data } = await api.get<AgencySpendReport>(
    ENDPOINTS.AGENCY.BRAND_LINK_SPEND_REPORT(brandId),
  );
  return data;
}

// ----------------------------------------------------------------- brand side

export type BrandAgencyLinksResponse = {
  completeness: BrandCompleteness;
  links: BrandAgencyLink[];
};

export async function fetchBrandAgencyLinks(): Promise<BrandAgencyLinksResponse> {
  const { data } = await api.get<BrandAgencyLinksResponse>(
    ENDPOINTS.BRANDS.AGENCY_LINKS,
  );
  return data;
}

export async function requestAgencyLink(
  partnerId: string,
): Promise<{ linkId: string; agencyName: string }> {
  const { data } = await api.post<{ linkId: string; agencyName: string }>(
    ENDPOINTS.BRANDS.AGENCY_LINKS,
    { partnerId },
  );
  return data;
}

export async function cancelAgencyLinkRequest(id: string): Promise<void> {
  await api.post(ENDPOINTS.BRANDS.AGENCY_LINK_CANCEL(id));
}

export async function revokeAgencyLink(
  id: string,
  reason?: string,
): Promise<void> {
  await api.post(ENDPOINTS.BRANDS.AGENCY_LINK_REVOKE(id), { reason });
}

/** What to tell the brand for each unmet requirement. */
export const BRAND_COMPLETENESS_GAP_LABELS: Record<
  BrandCompletenessGap,
  string
> = {
  BRAND_NAME_MISSING: "Add your brand name",
  CONTACT_NAME_MISSING: "Add a contact name",
  CONTACT_PHONE_MISSING: "Add a contact phone number",
  PHONE_NOT_VERIFIED: "Verify your phone number",
};

/**
 * How a partner-link request failed, for UI that must explain itself.
 *
 * Two of these arrive as a 404 and are told apart by message, because the
 * server uses NotFoundException for each: `assertEnabled()` sends "Not found"
 * when AGENCY_BRAND_PARTNER_LINKS_ENABLED is off, while a missing profile row
 * sends "Brand profile not found". The third is the brand-side 403 raised when
 * the caller is working inside a brand they do not own.
 *
 * The distinction matters to whoever is looking at the screen: "this isn't
 * switched on here", "finish signing up" and "you are in the wrong workspace"
 * are three different answers, and none of them is "something is broken".
 */
export type PartnerLinkFailure =
  | "feature-disabled"
  | "no-profile"
  | "wrong-workspace"
  | "other";

export function classifyPartnerLinkError(error: unknown): PartnerLinkFailure {
  const response = (
    error as { response?: { status?: number; data?: { message?: string } } }
  )?.response;

  if (response?.status === 403) return "wrong-workspace";
  if (response?.status !== 404) return "other";

  const message = response.data?.message ?? "";
  if (message === "Not found") return "feature-disabled";
  if (message.toLowerCase().includes("profile not found")) return "no-profile";
  return "other";
}
