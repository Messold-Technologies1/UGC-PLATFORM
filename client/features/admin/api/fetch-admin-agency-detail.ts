import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminAgencyDetailDto,
  AdminBrandWishlistsResponseDto,
} from "../types";

export async function fetchAdminAgencyDetail(
  agencyId: string,
): Promise<AdminAgencyDetailDto> {
  const { data } = await api.get<AdminAgencyDetailDto>(
    ENDPOINTS.ADMIN.AGENCIES.DETAIL(agencyId),
  );
  return data;
}

export async function fetchAdminAgencyWishlists(
  agencyId: string,
): Promise<AdminBrandWishlistsResponseDto> {
  const { data } = await api.get<AdminBrandWishlistsResponseDto>(
    ENDPOINTS.ADMIN.AGENCIES.WISHLISTS(agencyId),
  );
  return data;
}
