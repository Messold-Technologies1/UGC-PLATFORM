import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { sendCreatorForReview } from "../api/send-creator-for-review";

export function useSendCreatorForReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendCreatorForReview,
    onSuccess: () => {
      toast.success("Sent for review");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Send for review failed: ${err.response.data.message}`);
      } else {
        toast.error("Failed to send creator for review");
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
