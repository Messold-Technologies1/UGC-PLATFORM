import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminReshuffleResultDto } from "../types";

/**
 * Run the fortnightly reshuffle now rather than waiting for the 1st or 16th.
 *
 * Does exactly what the scheduled run does, replacement of any hand-dragged
 * order included — that is what a reshuffle is.
 */
export async function reshuffleBrowseOrder(): Promise<AdminReshuffleResultDto> {
  const { data } = await api.post<AdminReshuffleResultDto>(
    ENDPOINTS.ADMIN.CREATORS.BROWSE_ORDER_RESHUFFLE,
  );
  return data;
}
