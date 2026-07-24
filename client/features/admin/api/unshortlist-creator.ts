import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorProfileResponseDto } from "../types";

export async function unshortlistCreator(
  id: string,
): Promise<CreatorProfileResponseDto> {
  const { data } = await api.patch<CreatorProfileResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.UNSHORTLIST(id),
  );
  return data;
}
