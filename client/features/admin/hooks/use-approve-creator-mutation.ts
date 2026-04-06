import { useMutation, useQueryClient } from "@tanstack/react-query";
import { approveCreator } from "../api/approve-creator";

import { toast } from "sonner";
import { isAxiosError } from "axios";

export function useApproveCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: approveCreator,
    onMutate: async (id) => {
      toast.success("Creator approved successfully");
      await queryClient.cancelQueries({ queryKey: ["admin", "pending-approvals"] });
      const previousQueries = queryClient.getQueriesData({ queryKey: ["admin", "pending-approvals"] });

      queryClient.setQueriesData(
        { queryKey: ["admin", "pending-approvals"] },
        (oldData: { items: { id: string }[]; total: number } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.filter((c) => c.id !== id),
            total: Math.max(0, oldData.total - 1),
          };
        }
      );

      return { previousQueries };
    },
    onError: (err, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, oldData]) => {
          queryClient.setQueryData(key, oldData);
        });
      }

      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Approval failed: ${err.response.data.message}`);
      } else {
        toast.error("An error occurred during approval");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "pending-approvals"],
      });
    },
  });
}
