import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorListItemDto } from "../types";

export async function setFirstOrderFree(
  id: string,
  enabled: boolean,
): Promise<AdminCreatorListItemDto> {
  const { data } = await api.patch<AdminCreatorListItemDto>(
    ENDPOINTS.ADMIN.CREATORS.FIRST_ORDER_FREE(id),
    { enabled },
  );
  return data;
}
