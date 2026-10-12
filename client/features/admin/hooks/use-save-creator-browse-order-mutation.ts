import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveCreatorBrowseOrder } from "../api/save-creator-browse-order";
import { adminBrowseOrderCreatorsQueryKey } from "./use-admin-browse-order-creators-query";

export function useSaveCreatorBrowseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creatorIds: string[]) => saveCreatorBrowseOrder(creatorIds),
    onSuccess: () => {
      toast.success("Order saved");
      // Brands read the listing from a cached page — rebuild it so the new
      // order is live for them straight away.
      void fetch("/api/internal/revalidate-creators-list", { method: "POST" });
    },
    onError: () => {
      toast.error("Could not save the new order");
      // The board is showing an order the server rejected: pull the real one
      // back so what is on screen is what brands would see.
      void queryClient.invalidateQueries({
        queryKey: adminBrowseOrderCreatorsQueryKey,
      });
    },
  });
}
