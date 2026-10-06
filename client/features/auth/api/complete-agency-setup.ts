import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type CompleteAgencySetupPayload = {
  name: string;
  contactPhone?: string;
  website?: string;
  logoKey?: string;
};

export type CreatedAgencyProfile = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export async function completeAgencySetup(
  payload: CompleteAgencySetupPayload,
): Promise<CreatedAgencyProfile> {
  const { data } = await api.post<CreatedAgencyProfile>(
    ENDPOINTS.AGENCY.PROFILE,
    payload,
  );
  return data;
}
