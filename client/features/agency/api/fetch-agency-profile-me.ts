import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type AgencyProfile = {
  id: string;
  ownerUserId: string;
  name: string;
  logoKey: string | null;
  logoUrl: string | null;
  website: string | null;
  contactFullName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactPhoneVerified: boolean;
  brandNames: string[];
  createdAt: string;
  updatedAt: string;
};

export const agencyProfileMeQueryKey = ["agency", "profile", "me"] as const;

export async function fetchAgencyProfileMe(): Promise<AgencyProfile> {
  const { data } = await api.get<AgencyProfile>(ENDPOINTS.AGENCY.PROFILE_ME);
  return data;
}
