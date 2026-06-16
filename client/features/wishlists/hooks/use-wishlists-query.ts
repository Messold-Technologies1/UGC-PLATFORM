import { useQuery } from "@tanstack/react-query";
import { listWishlists } from "../api/list-wishlists";

export const wishlistsQueryKey = ["wishlists"] as const;

export function useWishlistsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: wishlistsQueryKey,
    queryFn: listWishlists,
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}
