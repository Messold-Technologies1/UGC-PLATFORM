import { useQuery } from "@tanstack/react-query";
import { fetchAdminCreatorSegmentCounts } from "../api/fetch-admin-creator-segment-counts";

export const adminCreatorSegmentCountsQueryKey = [
  "admin",
  "creators",
  "segment-counts",
];

export function useAdminCreatorSegmentCountsQuery() {
  return useQuery({
    queryKey: adminCreatorSegmentCountsQueryKey,
    queryFn: fetchAdminCreatorSegmentCounts,
    staleTime: 30_000,
  });
}
