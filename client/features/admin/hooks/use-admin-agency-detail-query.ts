import { useQuery } from "@tanstack/react-query";
import {
  fetchAdminAgencyDetail,
  fetchAdminAgencyWishlists,
} from "../api/fetch-admin-agency-detail";

export const adminAgencyDetailQueryKey = (agencyId: string) =>
  ["admin", "agency", agencyId] as const;

export function useAdminAgencyDetailQuery(agencyId: string | undefined) {
  return useQuery({
    queryKey: adminAgencyDetailQueryKey(agencyId ?? ""),
    queryFn: () => fetchAdminAgencyDetail(agencyId as string),
    enabled: Boolean(agencyId),
    staleTime: 60_000,
  });
}

export const adminAgencyWishlistsQueryKey = (agencyId: string) =>
  ["admin", "agency", agencyId, "wishlists"] as const;

export function useAdminAgencyWishlistsQuery(agencyId: string | undefined) {
  return useQuery({
    queryKey: adminAgencyWishlistsQueryKey(agencyId ?? ""),
    queryFn: () => fetchAdminAgencyWishlists(agencyId as string),
    enabled: Boolean(agencyId),
    staleTime: 60_000,
  });
}
