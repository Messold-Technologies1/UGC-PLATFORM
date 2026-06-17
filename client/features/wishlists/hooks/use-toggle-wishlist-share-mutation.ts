import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toggleWishlistShare } from "../api/toggle-wishlist-share";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";

export function useToggleWishlistShareMutation(wishlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => toggleWishlistShare(wishlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
    },
  });
}
