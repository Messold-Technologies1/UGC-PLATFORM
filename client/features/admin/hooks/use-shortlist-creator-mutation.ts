import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { shortlistCreator } from "../api/shortlist-creator";

export function useShortlistCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shortlistCreator,
    onSuccess: () => {
      toast.success("Creator shortlisted");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Shortlist failed: ${err.response.data.message}`);
      } else {
        toast.error("Failed to shortlist creator");
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
