import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { acceptBrief, type AcceptBriefPayload } from "../api/accept-brief";

type AcceptBriefMutationOptions = UseMutationOptions<
  void,
  Error,
  AcceptBriefPayload,
  unknown
>;

export function useAcceptBriefMutation(options?: AcceptBriefMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "accept-brief"],
    mutationFn: acceptBrief,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Brief accepted successfully");
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
        toast.error("Unable to accept the brief right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
