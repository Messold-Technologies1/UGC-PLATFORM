import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  reviseBriefForOrder,
  type ReviseBriefForOrderPayload,
} from "../api/revise-brief-for-order";
import type { Brief } from "../api/types";
import { briefDetailQueryKey } from "./use-get-brief-query";
import { briefsQueryKey } from "./use-list-briefs-query";
import { brandOrderDetailsQueryKey } from "@/features/orders/api/get-brand-order-details";
import { agencyProfileMeQueryKey } from "@/features/agency/api/fetch-agency-profile-me";

interface ReviseBriefForOrderVariables {
  id: string;
  payload: ReviseBriefForOrderPayload;
}

type UseReviseBriefForOrderMutationOptions = UseMutationOptions<
  Brief,
  Error,
  ReviseBriefForOrderVariables,
  unknown
>;

export function useReviseBriefForOrderMutation(
  options?: UseReviseBriefForOrderMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["briefs", "revise-for-order"],
    mutationFn: ({ id, payload }: ReviseBriefForOrderVariables) =>
      reviseBriefForOrder(id, payload),
    onSuccess: async (data, variables, onMutateResult, context) => {
      // The order now carries a different brief id, so both the order and the
      // brief it points at have to be refetched — the old id's cache entry is
      // no longer what anyone is looking at.
      await queryClient.invalidateQueries({
        queryKey: brandOrderDetailsQueryKey(variables.payload.orderId),
      });
      await queryClient.invalidateQueries({
        queryKey: ["orders", "brief", variables.payload.orderId],
      });
      await queryClient.invalidateQueries({
        queryKey: briefDetailQueryKey(variables.id),
      });
      await queryClient.invalidateQueries({ queryKey: briefsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: agencyProfileMeQueryKey,
      });
      toast.success("Brief updated and resent to the creator");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        const message = error.response.data.message;
        toast.error(Array.isArray(message) ? message[0] : String(message));
      } else {
        toast.error("Unable to update the brief right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
