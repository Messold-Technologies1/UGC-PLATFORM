import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeWishlistCreator } from "../api/remove-wishlist-creator";
import { wishlistsQueryKey } from "./use-wishlists-query";
import { wishlistDetailQueryKey } from "./use-wishlist-detail-query";
import type { WishlistDetail, ListWishlistsResponse } from "../api/types";

export function useRemoveWishlistCreatorMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ wishlistId, creatorId }: { wishlistId: string; creatorId: string }) =>
      removeWishlistCreator(wishlistId, creatorId),

    onMutate: async ({ wishlistId, creatorId }) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
      await queryClient.cancelQueries({ queryKey: wishlistsQueryKey });

      // Snapshot previous values for rollback
      const prevDetail = queryClient.getQueryData<WishlistDetail>(
        wishlistDetailQueryKey(wishlistId),
      );
      const prevList = queryClient.getQueryData<ListWishlistsResponse>(wishlistsQueryKey);

      // Optimistically remove from detail cache
      if (prevDetail) {
        queryClient.setQueryData<WishlistDetail>(wishlistDetailQueryKey(wishlistId), {
          ...prevDetail,
          creators: prevDetail.creators.filter((c) => c.id !== creatorId),
          creatorCount: Math.max(0, prevDetail.creatorCount - 1),
          creatorIds: prevDetail.creatorIds.filter((id) => id !== creatorId),
        });
      }

      // Optimistically update creator count in list cache
      if (prevList) {
        queryClient.setQueryData<ListWishlistsResponse>(wishlistsQueryKey, {
          ...prevList,
          items: prevList.items.map((w) =>
            w.id === wishlistId
              ? {
                  ...w,
                  creatorCount: Math.max(0, w.creatorCount - 1),
                  creatorIds: w.creatorIds.filter((id) => id !== creatorId),
                }
              : w,
          ),
        });
      }

      return { prevDetail, prevList };
    },

    onError: (_err, { wishlistId }, context) => {
      // Roll back on failure
      if (context?.prevDetail) {
        queryClient.setQueryData(wishlistDetailQueryKey(wishlistId), context.prevDetail);
      }
      if (context?.prevList) {
        queryClient.setQueryData(wishlistsQueryKey, context.prevList);
      }
    },

    onSettled: (_data, _err, { wishlistId }) => {
      // Reconcile with server truth after mutation settles
      queryClient.invalidateQueries({ queryKey: wishlistDetailQueryKey(wishlistId) });
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}
