import { useQuery } from "@tanstack/react-query";
import { getWishlist } from "../api/get-wishlist";

export function wishlistDetailQueryKey(id: string) {
  return ["wishlists", id] as const;
}

export function useWishlistDetailQuery(id: string) {
  return useQuery({
    queryKey: wishlistDetailQueryKey(id),
    queryFn: () => getWishlist(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}
