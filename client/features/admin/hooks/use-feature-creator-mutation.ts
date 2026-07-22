import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { featureCreator } from "../api/feature-creator";

export function useFeatureCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, rank, featuredUntil }: { id: string; rank?: number; featuredUntil?: string | null }) =>
      featureCreator(id, { rank, featuredUntil }),
    onSuccess: () => {
      toast.success("Creator featured");
    },
    onError: () => {
      toast.error("Failed to feature creator");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
      void queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
    },
  });
}
