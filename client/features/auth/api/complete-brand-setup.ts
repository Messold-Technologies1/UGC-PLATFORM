import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { getMetaBrowserIds } from "@/lib/meta-pixel";

export type CompleteBrandSetupPayload = {
  contactFullName?: string;
  contactEmail?: string;
  /** Required for Google post-signup setup. */
  contactPhone: string;
  /** Optional — can be set later in brand settings. */
  website?: string;
  /** Optional — can be set later in brand settings. */
  brandName?: string;
  logoKey?: string;
};

/** The bits of the created brand profile the signup flow needs back. */
export type CreatedBrandProfile = { id: string; brandName: string | null };

/**
 * Creates the brand profile for an authenticated user (the Google signup
 * route). The Meta attribution cookies are read here — in the user's own
 * browser — and sent along so the server's BrandRegistration conversion carries
 * the same match keys as the browser pixel's copy.
 */
export async function completeBrandSetup(
  payload: CompleteBrandSetupPayload,
): Promise<CreatedBrandProfile> {
  const { fbp, fbc } = getMetaBrowserIds();
  const { data } = await api.post<CreatedBrandProfile>(
    ENDPOINTS.BRANDS.PROFILE,
    {
      ...payload,
      ...(fbp ? { metaFbp: fbp } : {}),
      ...(fbc ? { metaFbc: fbc } : {}),
    },
  );
  return data;
}
