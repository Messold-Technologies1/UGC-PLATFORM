import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorEventApi } from "./types";

export async function updateEvent(input: {
  id: string;
  body: string;
  startsOn?: string;
  endsOn?: string;
}) {
  const { id, ...payload } = input;
  const { data } = await api.patch<CreatorEventApi>(
    ENDPOINTS.CREATOR_EVENTS.UPDATE(id),
    payload,
  );
  return data;
}
