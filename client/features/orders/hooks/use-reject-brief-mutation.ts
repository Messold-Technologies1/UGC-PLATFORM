import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { rejectBrief, type RejectBriefPayload } from "../api/reject-brief";

type RejectBriefMutationOptions = UseMutationOptions<
  void,
  Error,
  RejectBriefPayload,
  unknown
>;

export function useRejectBriefMutation(options?: RejectBriefMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "reject-brief"],
    mutationFn: rejectBrief,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Order rejected");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({
          queryKey: ["orders", "brief", variables.orderId],
        }),
      ]);
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to reject the order right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
