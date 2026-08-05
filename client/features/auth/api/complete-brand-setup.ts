import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CompleteBrandSetupPayload = {
  brandName: string;
  contactFullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoKey?: string;
};

export async function completeBrandSetup(
  payload: CompleteBrandSetupPayload,
): Promise<void> {
  await api.post(ENDPOINTS.BRANDS.PROFILE, payload);
}
