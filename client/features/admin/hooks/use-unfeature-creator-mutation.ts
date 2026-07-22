import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { unfeatureCreator } from "../api/unfeature-creator";

export function useUnfeatureCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unfeatureCreator(id),
    onSuccess: () => {
      toast.success("Creator unfeatured");
    },
    onError: () => {
      toast.error("Failed to unfeature creator");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
      void queryClient.invalidateQueries({ queryKey: ["creators", "list"] });
    },
  });
}
