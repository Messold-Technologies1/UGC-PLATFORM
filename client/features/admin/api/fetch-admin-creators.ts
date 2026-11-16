import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { serializeQueryParams } from "./serialize-query-params";
import type {
  AdminCreatorsListQueryDto,
  AdminCreatorsListResponseDto,
} from "../types";

export async function fetchAdminCreators(
  query: AdminCreatorsListQueryDto,
): Promise<AdminCreatorsListResponseDto> {
  const { data } = await api.get<AdminCreatorsListResponseDto>(
    ENDPOINTS.ADMIN.CREATORS.LIST,
    { params: query, paramsSerializer: serializeQueryParams },
  );
  return data;
}
