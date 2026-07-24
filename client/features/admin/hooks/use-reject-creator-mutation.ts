import { useMutation, useQueryClient } from "@tanstack/react-query";
import { rejectCreator } from "../api/reject-creator";

import { toast } from "sonner";
import { isAxiosError } from "axios";

export function useRejectCreatorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rejectCreator,
    onMutate: async ({ id }) => {
      toast.success("Creator rejected.");
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

      // Optimistically remove from rejected list if re-rejecting
      queryClient.setQueriesData(
        { queryKey: ["admin", "rejected-approvals"] },
        (oldData: { items: { id: string }[]; total: number } | undefined) => {
          if (!oldData) return oldData;
          const nextItems = oldData.items.filter((c) => c.id !== id);
          if (nextItems.length === oldData.items.length) return oldData;
          return {
            ...oldData,
            items: nextItems,
            total: Math.max(0, oldData.total - 1),
          };
        },
      );

      // Also optimistically remove from the main creators list if they are there
      queryClient.setQueriesData(
        { queryKey: ["creators", "list"] },
        (oldList: any) => {
          if (!oldList || !oldList.creators) return oldList;
          const filteredCreators = oldList.creators.filter((c: any) => c.id !== id);
          if (filteredCreators.length === oldList.creators.length) return oldList;
          return {
            ...oldList,
            creators: filteredCreators,
            total: Math.max(0, oldList.total - 1),
          };
        }
      );

      return { previousQueries };
    },
    onError: (err, variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, oldData]) => {
          queryClient.setQueryData(key, oldData);
        });
      }

      if (isAxiosError(err) && err.response?.data?.message) {
        toast.error(`Rejection failed: ${err.response.data.message}`);
      } else {
        toast.error("An error occurred during rejection");
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin", "pending-approvals"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "rejected-approvals"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "creators"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin", "creators", "segment-counts"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creators", "list"],
      });
    },
  });
}
