import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateWishlist } from "../api/update-wishlist";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";

export function useUpdateWishlistMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; creatorIds?: string[] }) =>
      updateWishlist(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(id) });
    },
  });
}
