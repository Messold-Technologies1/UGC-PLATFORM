import { useQuery } from "@tanstack/react-query";
import {
  adminCreatorPayoutDetailsQueryKey,
  fetchAdminCreatorPayoutDetails,
} from "../api/fetch-admin-creator-payout-details";

export function useAdminCreatorPayoutDetailsQuery(
  creatorId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: adminCreatorPayoutDetailsQueryKey(creatorId),
    queryFn: () => fetchAdminCreatorPayoutDetails(creatorId),
    enabled: enabled && !!creatorId,
    staleTime: 0,
    gcTime: 0,
  });
}
