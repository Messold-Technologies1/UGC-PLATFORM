import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminCreatorEventApi,
  AdminEventStatus,
  PagedEvents,
} from "./types";

export async function listAdminEvents(params: {
  cursor?: string;
  limit?: number;
  status?: AdminEventStatus;
  search?: string;
}) {
  const { data } = await api.get<PagedEvents<AdminCreatorEventApi>>(
    ENDPOINTS.CREATOR_EVENTS.ADMIN_LIST,
    { params },
  );
  return data;
}

export async function hideAdminEvent(input: { id: string; reason?: string }) {
  const { data } = await api.post<AdminCreatorEventApi>(
    ENDPOINTS.CREATOR_EVENTS.ADMIN_HIDE(input.id),
    { reason: input.reason },
  );
  return data;
}

export async function unhideAdminEvent(id: string) {
  const { data } = await api.post<AdminCreatorEventApi>(
    ENDPOINTS.CREATOR_EVENTS.ADMIN_UNHIDE(id),
    {},
  );
  return data;
}
