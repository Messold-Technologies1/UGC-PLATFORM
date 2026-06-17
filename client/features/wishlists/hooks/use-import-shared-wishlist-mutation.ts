import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  importSharedWishlist,
  type ImportSharedWishlistPayload,
} from "../api/import-shared-wishlist";
import { wishlistsQueryKey } from "../hooks/use-wishlists-query";

export function useImportSharedWishlistMutation(shareToken: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ImportSharedWishlistPayload) =>
      importSharedWishlist(shareToken, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}
