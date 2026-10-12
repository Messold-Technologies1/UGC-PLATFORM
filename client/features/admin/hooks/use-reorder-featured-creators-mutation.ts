import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reorderFeaturedCreators } from "../api/reorder-featured-creators";
import type { AdminFeaturedCreatorsBoardDto } from "../types";
import { adminFeaturedCreatorsQueryKey } from "./use-admin-featured-creators-query";

export function useReorderFeaturedCreatorsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creatorIds: string[]) => reorderFeaturedCreators(creatorIds),
    onSuccess: (board: AdminFeaturedCreatorsBoardDto) => {
      // The server echoes the saved order, so seed the cache with it rather
      // than refetching the whole board after every drag.
      queryClient.setQueryData(adminFeaturedCreatorsQueryKey, board);
      toast.success("Featured order saved");
      // Brands read the listing from a cached page — rebuild it so the new
      // order is live for them straight away.
      void fetch("/api/internal/revalidate-creators-list", { method: "POST" });
    },
    onError: () => {
      toast.error("Could not save the new order");
      void queryClient.invalidateQueries({
        queryKey: adminFeaturedCreatorsQueryKey,
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
      void queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
    },
  });
}
