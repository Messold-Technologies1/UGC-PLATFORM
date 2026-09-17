import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { setFirstOrderFree } from "../api/set-first-order-free";

export function useFirstOrderFreeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      setFirstOrderFree(id, enabled),
    onSuccess: (_data, { enabled }) => {
      toast.success(
        enabled ? "First order free enabled" : "First order free disabled",
      );
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Update failed: ${err.response.data.message}`);
      } else {
        toast.error("Failed to update first order free");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "creators"] });
    },
  });
}
