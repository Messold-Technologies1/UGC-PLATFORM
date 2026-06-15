import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWishlistCreator } from "../api/add-wishlist-creator";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";

export function useAddWishlistCreatorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wishlistId, creatorId }: { wishlistId: string; creatorId: string }) =>
      addWishlistCreator(wishlistId, creatorId),
    onSuccess: (_data, { wishlistId }) => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
    },
  });
}
