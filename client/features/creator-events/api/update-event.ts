import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorEventApi } from "./types";

export async function updateEvent(input: { id: string; body: string }) {
  const { data } = await api.patch<CreatorEventApi>(
    ENDPOINTS.CREATOR_EVENTS.UPDATE(input.id),
    { body: input.body },
  );
  return data;
}
