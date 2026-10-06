import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminAgenciesListResponseDto,
  AdminAgenciesQueryDto,
} from "../types";

export async function fetchAgencies(
  query?: AdminAgenciesQueryDto,
): Promise<AdminAgenciesListResponseDto> {
  const { data } = await api.get<AdminAgenciesListResponseDto>(
    ENDPOINTS.ADMIN.AGENCIES.LIST,
    { params: query },
  );
  return data;
}
