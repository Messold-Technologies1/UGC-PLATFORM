import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createWishlist } from "../api/create-wishlist";
import { wishlistsQueryKey } from "./use-wishlists-query";

export function useCreateWishlistMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wishlistsQueryKey });
    },
  });
}
