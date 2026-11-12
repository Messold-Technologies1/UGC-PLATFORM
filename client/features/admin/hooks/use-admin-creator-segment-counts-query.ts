import { useQuery } from "@tanstack/react-query";
import { fetchAdminCreatorSegmentCounts } from "../api/fetch-admin-creator-segment-counts";
import type { AdminCreatorListFilters } from "../types";

export const adminCreatorSegmentCountsQueryKey = (
  filters: AdminCreatorListFilters = {},
) => [
  "admin",
  "creators",
  "segment-counts",
  // Serialized whole: the filter set is wide enough that listing each key
  // here would be a second place to update every time one is added.
  JSON.stringify({ ...filters, search: filters.search?.trim() || "" }),
];

/**
 * Counts for every tab under the CURRENT search and filters, so each tab
 * reports what clicking it would return rather than a global total.
 */
export function useAdminCreatorSegmentCountsQuery(
  filters: AdminCreatorListFilters = {},
) {
  return useQuery({
    queryKey: adminCreatorSegmentCountsQueryKey(filters),
    queryFn: () => fetchAdminCreatorSegmentCounts(filters),
    staleTime: 30_000,
    // Keeps the previous numbers on the tabs while a new search resolves,
    // instead of blinking every count to "…" on each keystroke.
    placeholderData: (previous) => previous,
  });
}
