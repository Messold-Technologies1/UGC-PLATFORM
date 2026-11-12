import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { serializeQueryParams } from "./serialize-query-params";
import type {
  AdminCreatorListFilters,
  AdminCreatorSegmentCountsDto,
} from "../types";

export async function fetchAdminCreatorSegmentCounts(
  filters: AdminCreatorListFilters = {},
): Promise<AdminCreatorSegmentCountsDto> {
  const { data } = await api.get<AdminCreatorSegmentCountsDto>(
    ENDPOINTS.ADMIN.CREATORS.SEGMENT_COUNTS,
    { params: filters, paramsSerializer: serializeQueryParams },
  );
  return data;
}
