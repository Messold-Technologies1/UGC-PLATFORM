import { useMutation, useQueryClient } from "@tanstack/react-query";
import { disableWishlistShare } from "../api/disable-wishlist-share";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";

export function useDisableWishlistShareMutation(wishlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => disableWishlistShare(wishlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
    },
  });
}
