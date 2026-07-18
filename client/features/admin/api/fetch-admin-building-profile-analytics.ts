import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminBuildingProfileAnalyticsDto } from "../types";

export async function fetchAdminBuildingProfileAnalytics(): Promise<AdminBuildingProfileAnalyticsDto> {
  const { data } = await api.get<AdminBuildingProfileAnalyticsDto>(
    ENDPOINTS.ADMIN.CREATORS.BUILDING_PROFILE_ANALYTICS,
  );
  return data;
}
