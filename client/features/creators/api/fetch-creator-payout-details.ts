import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorPayoutDetailsMaskedApi } from "./types";

export const creatorPayoutDetailsQueryKey = ["creator-profile", "me", "payout-details"] as const;

export async function fetchCreatorPayoutDetailsMe(): Promise<CreatorPayoutDetailsMaskedApi> {
  const { data } = await api.get<CreatorPayoutDetailsMaskedApi>(
    ENDPOINTS.CREATORS.PROFILE_PAYOUT_DETAILS,
  );
  return data;
}
