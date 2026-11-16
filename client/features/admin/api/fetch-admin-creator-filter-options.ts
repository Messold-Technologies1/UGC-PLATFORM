import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorFilterOptionsDto } from "../types";

export async function fetchAdminCreatorFilterOptions(): Promise<AdminCreatorFilterOptionsDto> {
  const { data } = await api.get<AdminCreatorFilterOptionsDto>(
    ENDPOINTS.ADMIN.CREATORS.FILTER_OPTIONS,
  );
  return data;
}
