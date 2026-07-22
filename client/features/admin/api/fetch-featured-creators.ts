import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AdminCreatorsListResponseDto } from "../types";

export async function fetchFeaturedCreators(query: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<AdminCreatorsListResponseDto> {
  const { data } = await api.get<AdminCreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.FEATURED,
    { params: query },
  );
  return data;
}
