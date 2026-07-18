import { useQuery } from "@tanstack/react-query";
import { fetchAdminBuildingProfileAnalytics } from "../api/fetch-admin-building-profile-analytics";

export const adminBuildingProfileAnalyticsQueryKey = [
  "admin",
  "creators",
  "building-profile-analytics",
];

export function useAdminBuildingProfileAnalyticsQuery(enabled = true) {
  return useQuery({
    queryKey: adminBuildingProfileAnalyticsQueryKey,
    queryFn: fetchAdminBuildingProfileAnalytics,
    enabled,
    staleTime: 30_000,
  });
}
