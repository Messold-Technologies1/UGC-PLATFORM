import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorListItemDto, AdminFeatureCreatorDto } from "../types";

export async function featureCreator(
  id: string,
  dto: AdminFeatureCreatorDto,
): Promise<AdminCreatorListItemDto> {
  const { data } = await api.patch<AdminCreatorListItemDto>(
    ENDPOINTS.ADMIN.CREATORS.FEATURE(id),
    dto,
  );
  return data;
}
