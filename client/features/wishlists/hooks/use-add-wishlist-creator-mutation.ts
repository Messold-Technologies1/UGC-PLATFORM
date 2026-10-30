import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWishlistCreator } from "../api/add-wishlist-creator";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";
import { bumpCreatorSavedCount } from "../lib/bump-creator-saved-count";

export function useAddWishlistCreatorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      wishlistId,
      creatorId,
    }: {
      wishlistId: string;
      creatorId: string;
    }) => addWishlistCreator(wishlistId, creatorId),
    onSuccess: (_data, { wishlistId, creatorId }) => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
      queryClient.invalidateQueries({
        queryKey: wishlistDetailQueryKey(wishlistId),
      });
      // The browse list holds its pages for five minutes, so without this the
      // card the viewer just saved goes on reporting the count it was fetched
      // with — the heart fills but "times saved" does not move.
      bumpCreatorSavedCount(queryClient, creatorId, 1);
    },
  });
}
