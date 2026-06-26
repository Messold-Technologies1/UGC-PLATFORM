import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorPayoutDetailsDto } from "../types";

export function adminCreatorPayoutDetailsQueryKey(creatorId: string) {
  return ["admin", "creators", creatorId, "payout-details"] as const;
}

export async function fetchAdminCreatorPayoutDetails(
  creatorId: string,
): Promise<AdminCreatorPayoutDetailsDto> {
  const { data } = await api.get<AdminCreatorPayoutDetailsDto>(
    ENDPOINTS.ADMIN.CREATORS.PAYOUT_DETAILS(creatorId),
  );
  return data;
}
