import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  attachBriefToOrders,
  type AttachBriefToOrdersPayload,
  type AttachBriefToOrdersResponse,
} from "../api/attach-brief-to-orders";

type AttachBriefToOrdersMutationOptions = UseMutationOptions<
  AttachBriefToOrdersResponse,
  Error,
  AttachBriefToOrdersPayload,
  unknown
>;

export function useAttachBriefToOrdersMutation(
  options?: AttachBriefToOrdersMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["briefs", "attach-to-orders"],
    mutationFn: attachBriefToOrders,
    onSuccess: (data, variables, onMutateResult, context) => {
      const { submittedCount, skippedCount, failedCount } = data;

      if (submittedCount > 0) {
        toast.success(
          `Brief submitted to ${submittedCount} order${
            submittedCount === 1 ? "" : "s"
          }`,
        );
      }
      if (skippedCount > 0) {
        toast.info(
          `${skippedCount} order${
            skippedCount === 1 ? " was" : "s were"
          } skipped (no longer awaiting a brief)`,
        );
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} order${
            failedCount === 1 ? "" : "s"
          } could not be submitted`,
        );
      }
      if (submittedCount === 0 && skippedCount === 0 && failedCount === 0) {
        toast.info("No orders were submitted");
      }

      void queryClient.invalidateQueries({ queryKey: ["orders", "brand"] });

      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to submit the brief right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
