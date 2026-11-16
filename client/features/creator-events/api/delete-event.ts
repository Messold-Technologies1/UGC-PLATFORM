import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export async function deleteEvent(id: string) {
  await api.delete(ENDPOINTS.CREATOR_EVENTS.DELETE(id));
}
