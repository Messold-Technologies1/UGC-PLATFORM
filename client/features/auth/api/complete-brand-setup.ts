import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

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

export async function completeBrandSetup(
  payload: CompleteBrandSetupPayload,
): Promise<void> {
  await api.post(ENDPOINTS.BRANDS.PROFILE, payload);
}
