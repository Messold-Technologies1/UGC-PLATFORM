import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorSegmentCountsDto } from "../types";

export async function fetchAdminCreatorSegmentCounts(): Promise<AdminCreatorSegmentCountsDto> {
  const { data } = await api.get<AdminCreatorSegmentCountsDto>(
    ENDPOINTS.ADMIN.CREATORS.SEGMENT_COUNTS,
  );
  return data;
}
