import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorEventApi } from "./types";

export async function createEvent(body: string) {
  const { data } = await api.post<CreatorEventApi>(
    ENDPOINTS.CREATOR_EVENTS.CREATE,
    { body },
  );
  return data;
}
