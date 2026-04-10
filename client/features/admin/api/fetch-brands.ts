import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminBrandsListResponseDto,
  AdminBrandsQueryDto,
} from "../types";

export async function fetchBrands(
  query?: AdminBrandsQueryDto,
): Promise<AdminBrandsListResponseDto> {
  const { data } = await api.get<AdminBrandsListResponseDto>(
    ENDPOINTS.ADMIN.BRANDS.LIST,
    { params: query },
  );
  return data;
}
