import { useQuery } from "@tanstack/react-query";
import { fetchAdminCreatorFilterOptions } from "../api/fetch-admin-creator-filter-options";

export const adminCreatorFilterOptionsQueryKey = [
  "admin",
  "creators",
  "filter-options",
];

/** Niches and cities that exist across creators, for the filter menus. */
export function useAdminCreatorFilterOptionsQuery() {
  return useQuery({
    queryKey: adminCreatorFilterOptionsQueryKey,
    queryFn: fetchAdminCreatorFilterOptions,
    // The catalogue barely moves; refetching it per search would be waste.
    staleTime: 5 * 60_000,
  });
}
