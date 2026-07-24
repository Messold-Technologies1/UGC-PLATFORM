import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { unshortlistCreator } from "../api/unshortlist-creator";

export function useUnshortlistCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unshortlistCreator,
    onSuccess: () => {
      toast.success("Removed from shortlist");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Remove failed: ${err.response.data.message}`);
      } else {
        toast.error("Failed to remove from shortlist");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "creators", "segment-counts"],
      });
    },
  });
}
