import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorEventApi, PagedEvents } from "./types";

export async function listMyEvents(params: { cursor?: string; limit?: number } = {}) {
  const { data } = await api.get<PagedEvents<CreatorEventApi>>(
    ENDPOINTS.CREATOR_EVENTS.MINE,
    { params },
  );
  return data;
}
