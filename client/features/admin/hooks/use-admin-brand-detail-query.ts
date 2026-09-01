import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminBrandDetail,
  fetchAdminBrandWishlists,
} from "../api/fetch-admin-brand-detail";

export const adminBrandDetailQueryKey = (brandProfileId: string) =>
  ["admin", "brand", brandProfileId] as const;

export function useAdminBrandDetailQuery(brandProfileId: string | undefined) {
  return useQuery({
    queryKey: adminBrandDetailQueryKey(brandProfileId ?? ""),
    queryFn: () => fetchAdminBrandDetail(brandProfileId as string),
    enabled: Boolean(brandProfileId),
    staleTime: 60_000,
  });
}

export const adminBrandWishlistsQueryKey = (brandProfileId: string) =>
  ["admin", "brand", brandProfileId, "wishlists"] as const;

export function useAdminBrandWishlistsQuery(
  brandProfileId: string | undefined,
) {
  return useQuery({
    queryKey: adminBrandWishlistsQueryKey(brandProfileId ?? ""),
    queryFn: () => fetchAdminBrandWishlists(brandProfileId as string),
    enabled: Boolean(brandProfileId),
    staleTime: 60_000,
  });
}
