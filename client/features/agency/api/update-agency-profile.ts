import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AgencyProfile } from "./fetch-agency-profile-me";

export type UpdateAgencyProfilePayload = {
  name?: string;
  contactFullName?: string;
  contactPhone?: string | null;
  website?: string | null;
  logoKey?: string | null;
};

export async function updateAgencyProfile(
  payload: UpdateAgencyProfilePayload,
): Promise<AgencyProfile> {
  const { data } = await api.patch<AgencyProfile>(
    ENDPOINTS.AGENCY.PROFILE,
    payload,
  );
  return data;
}
