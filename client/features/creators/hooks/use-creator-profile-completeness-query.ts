import { useQuery } from "@tanstack/react-query";
import {
  creatorProfileCompletenessQueryKey,
  fetchCreatorProfileCompleteness,
} from "../api/fetch-creator-profile-completeness";

/**
 * What the signed-in creator's profile is still missing, re-evaluated server
 * side on every fetch. `staleTime: 0` on purpose: this gates brief acceptance,
 * and a creator who just fixed a gap in another tab should see it clear the
 * moment they come back.
 */
export function useCreatorProfileCompletenessQuery(options?: {
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: creatorProfileCompletenessQueryKey,
    queryFn: fetchCreatorProfileCompleteness,
    enabled: options?.enabled,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}
