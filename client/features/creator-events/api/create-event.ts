import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorEventApi } from "./types";

export interface CreateEventInput {
  body: string;
  /** YYYY-MM-DD. Empty string clears; omitted leaves unset. */
  startsOn?: string;
  endsOn?: string;
}

export async function createEvent(input: CreateEventInput) {
  const { data } = await api.post<CreatorEventApi>(
    ENDPOINTS.CREATOR_EVENTS.CREATE,
    input,
  );
  return data;
}
