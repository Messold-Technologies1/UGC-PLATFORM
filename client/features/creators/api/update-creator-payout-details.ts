import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  CreatorPayoutDetailsMaskedApi,
  UpsertCreatorPayoutDetailsApi,
} from "./types";

export async function updateCreatorPayoutDetailsMe(
  payload: UpsertCreatorPayoutDetailsApi,
): Promise<CreatorPayoutDetailsMaskedApi> {
  const { data } = await api.patch<CreatorPayoutDetailsMaskedApi>(
    ENDPOINTS.CREATORS.PROFILE_PAYOUT_DETAILS,
    payload,
  );
  return data;
}
