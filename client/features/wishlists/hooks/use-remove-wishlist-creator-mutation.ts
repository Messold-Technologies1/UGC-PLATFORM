import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeWishlistCreator } from "../api/remove-wishlist-creator";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";

export function useRemoveWishlistCreatorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wishlistId, creatorId }: { wishlistId: string; creatorId: string }) =>
      removeWishlistCreator(wishlistId, creatorId),
    onSuccess: (_data, { wishlistId }) => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
    },
  });
}
