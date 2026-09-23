import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  setBrandUserActive,
  type BrandUserStatus,
} from "../api/set-brand-user-status";

type Variables = { userId: string; active: boolean };

type CachedList = {
  items: { userId: string; status: BrandUserStatus }[];
  total: number;
};

export function useSetBrandUserStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, active }: Variables) =>
      setBrandUserActive(userId, active),

    onMutate: async ({ userId, active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "brands"] });
      const previousQueries = queryClient.getQueriesData({
        queryKey: ["admin", "brands"],
      });

      // The row stays in the list — only its status changes. Nothing is
      // deleted, so the total is unaffected and paging does not shift.
      queryClient.setQueriesData(
        { queryKey: ["admin", "brands"] },
        (oldData: CachedList | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            items: oldData.items.map((item) =>
              item.userId === userId
                ? { ...item, status: active ? "ACTIVE" : "DEACTIVATED" }
                : item,
            ),
          };
        },
      );

      return { previousQueries };
    },

    onSuccess: (_data, { active }) => {
      toast.success(active ? "Brand reactivated." : "Brand deactivated.");
    },

    onError: (err, _variables, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, oldData]) => {
          queryClient.setQueryData(key, oldData);
        });
      }

      if (isAxiosError(err) && err.response?.data?.message) {
        const message = err.response.data.message;
        toast.error(
          Array.isArray(message) ? String(message[0]) : String(message),
        );
      } else {
        toast.error("Could not update this brand's status.");
      }
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
  });
}
