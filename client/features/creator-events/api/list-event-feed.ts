import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { FeedCreatorEventApi, PagedEvents } from "./types";

export async function listEventFeed(params: { cursor?: string; limit?: number } = {}) {
  const { data } = await api.get<PagedEvents<FeedCreatorEventApi>>(
    ENDPOINTS.CREATOR_EVENTS.FEED,
    { params },
  );
  return data;
}
