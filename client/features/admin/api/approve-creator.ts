import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { CreatorProfileResponseDto } from "../types";

export async function approveCreator(id: string): Promise<CreatorProfileResponseDto> {
  const { data } = await api.patch<CreatorProfileResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.APPROVE(id)
  );
  return data;
}
