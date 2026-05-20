import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type SwitchAgencyBrandResponse = {
  activeBrandProfileId: string;
  brandName: string;
  logoUrl: string | null;
};

export async function switchAgencyBrand(
  brandProfileId: string,
): Promise<SwitchAgencyBrandResponse> {
  const { data } = await api.post<SwitchAgencyBrandResponse>(
    ENDPOINTS.AGENCY.BRANDS_SWITCH,
    { brandProfileId },
  );
  return data;
}
