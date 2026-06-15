import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWishlist } from "../api/delete-wishlist";
import { wishlistsQueryKey } from "./use-wishlists-query";

export function useDeleteWishlistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}
