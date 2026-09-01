import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  AdminBrandDetailDto,
  AdminBrandWishlistsResponseDto,
} from "../types";

export async function fetchAdminBrandDetail(
  brandProfileId: string,
): Promise<AdminBrandDetailDto> {
  const { data } = await api.get<AdminBrandDetailDto>(
    ENDPOINTS.ADMIN.BRANDS.DETAIL(brandProfileId),
  );
  return data;
}

export async function fetchAdminBrandWishlists(
  brandProfileId: string,
): Promise<AdminBrandWishlistsResponseDto> {
  const { data } = await api.get<AdminBrandWishlistsResponseDto>(
    ENDPOINTS.ADMIN.BRANDS.WISHLISTS(brandProfileId),
  );
  return data;
}
