import { useQuery } from "@tanstack/react-query";
import {
  creatorPayoutDetailsQueryKey,
  fetchCreatorPayoutDetailsMe,
} from "../api/fetch-creator-payout-details";

export function useCreatorPayoutDetailsQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: creatorPayoutDetailsQueryKey,
    queryFn: fetchCreatorPayoutDetailsMe,
    enabled: options?.enabled,
  });
}
