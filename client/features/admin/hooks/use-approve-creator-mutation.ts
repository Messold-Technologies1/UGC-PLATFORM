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

      queryClient.setQueriesData(
        { queryKey: ["admin", "rejected-approvals"] },
        (oldData: { items: { id: string }[]; total: number } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.filter((c) => c.id !== id),
            total: Math.max(0, oldData.total - 1),
          };
        },
      );

      // Optimistically inject the new creator into the creators list cache
      let pendingCreator: any;
      for (const [key, oldData] of previousQueries) {
        if (oldData && (oldData as any).items) {
          const found = (oldData as any).items.find((c: any) => c.id === id);
          if (found) {
            pendingCreator = found;
            break;
          }
        }
      }

      if (pendingCreator) {
        queryClient.setQueriesData(
          { queryKey: ["creators", "list"] },
          (oldList: any) => {
            if (!oldList || !oldList.creators) return oldList;
            if (oldList.creators.some((c: any) => c.id === id)) return oldList;

            const newCreator = {
              id: pendingCreator.id,
              name: pendingCreator.displayName,
              location: [pendingCreator.city, pendingCreator.stateName, pendingCreator.countryName]
                .filter(Boolean)
                .join(", ") || "—",
              rating: 0,
              reviewCount: 0,
              startingPrice: 0,
              ordersCompleted: 0,
              thumbnail: pendingCreator.portfolioVideos?.[0]?.thumbnailUrl || "",
              tags: [],
              available: true,
              storeVisit: false,
              travelAvailable: false,
              gender: pendingCreator.gender || "—",
              category: pendingCreator.contentCategories?.[0]?.label || "Apparel",
              categories: pendingCreator.contentCategories?.map((c: any) => c.label) || [],
              languages: [],
              deliveryDays: 5,
            };

            return {
              ...oldList,
              creators: [newCreator, ...oldList.creators],
              total: oldList.total + 1,
            };
          }
        );
      }

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
      void queryClient.invalidateQueries({
        queryKey: ["admin", "rejected-approvals"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["creators", "list"],
      });
    },
  });
}
