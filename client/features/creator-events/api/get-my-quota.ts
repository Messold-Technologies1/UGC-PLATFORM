import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

/** Posts published in the last 24h, for the "x of 10 today" line. */
export async function getMyEventQuota() {
  const { data } = await api.get<{ postedToday: number }>(
    ENDPOINTS.CREATOR_EVENTS.QUOTA,
  );
  return data;
}
