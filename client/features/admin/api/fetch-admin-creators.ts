import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminCreatorsListQueryDto,
  AdminCreatorsListResponseDto,
} from "../types";

export async function fetchAdminCreators(
  query: AdminCreatorsListQueryDto,
): Promise<AdminCreatorsListResponseDto> {
  const { data } = await api.get<AdminCreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.LIST,
    { params: query },
  );
  return data;
}
