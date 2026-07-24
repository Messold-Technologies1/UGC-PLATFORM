import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorProfileResponseDto } from "../types";

export async function shortlistCreator(
  id: string,
): Promise<CreatorProfileResponseDto> {
  const { data } = await api.patch<CreatorProfileResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.SHORTLIST(id),
  );
  return data;
}
