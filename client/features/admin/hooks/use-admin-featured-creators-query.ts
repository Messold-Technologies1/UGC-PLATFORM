import { useQuery } from "@tanstack/react-query";
import { fetchAdminFeaturedCreators } from "../api/fetch-admin-featured-creators";

/**
 * Deliberately not nested under ["admin", "creators"]: the row-list mutations
 * invalidate that whole prefix, which would throw away the order the board
 * just saved and make the cards flicker back through a refetch.
 */
export const adminFeaturedCreatorsQueryKey = [
  "admin",
  "featured-creators-board",
] as const;

export function useAdminFeaturedCreatorsQuery(enabled = true) {
  return useQuery({
    queryKey: adminFeaturedCreatorsQueryKey,
    queryFn: fetchAdminFeaturedCreators,
    enabled,
  });
}
