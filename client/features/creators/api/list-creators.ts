import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorsListResponse } from "./types";

export async function fetchCreatorsPage(
  page: number,
  limit: number,
): Promise<CreatorsListResponse> {
  const { data } = await api.get<CreatorsListResponse>(ENDPOINTS.CREATORS.LIST, {
    params: { page, limit },
  });
  return data;
}
