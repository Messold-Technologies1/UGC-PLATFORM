import { useMutation, useQueryClient } from "@tanstack/react-query";
import { enableWishlistShare } from "../api/enable-wishlist-share";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";

export function useEnableWishlistShareMutation(wishlistId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => enableWishlistShare(wishlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
    },
  });
}
