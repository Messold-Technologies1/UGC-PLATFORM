import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { removeBrandAccess } from "../api/remove-brand-access";

export function useRemoveBrandAccessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeBrandAccess,
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "brands"] });
      const previousQueries = queryClient.getQueriesData({
        queryKey: ["admin", "brands"],
      });

      queryClient.setQueriesData(
        { queryKey: ["admin", "brands"] },
        (
          oldData:
            | { items: { userId: string }[]; total: number }
            | undefined,
        ) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.filter((item) => item.userId !== userId),
            total: Math.max(0, oldData.total - 1),
          };
        },
      );

      return { previousQueries };
    },
    onSuccess: () => {
      toast.success("Brand access removed.");
    },
    onError: (err, _userId, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, oldData]) => {
          queryClient.setQueryData(key, oldData);
        });
      }

      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Could not remove brand access: ${err.response.data.message}`);
      } else {
        toast.error("Could not remove brand access.");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
  });
}
