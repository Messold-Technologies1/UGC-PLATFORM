import { isAxiosError } from "axios";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  attachBriefToOrder,
  type AttachBriefToOrderPayload,
} from "../api/attach-brief-to-order";

type AttachBriefToOrderMutationOptions = UseMutationOptions<
  void,
  Error,
  AttachBriefToOrderPayload,
  unknown
>;

export function useAttachBriefToOrderMutation(
  options?: AttachBriefToOrderMutationOptions,
) {
  return useMutation({
    ...options,
    mutationKey: ["briefs", "attach-to-order"],
    mutationFn: attachBriefToOrder,
    onSuccess: (data, variables, onMutateResult, context) => {
      toast.success("Brief attached to order successfully");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to attach the brief right now");
      }
      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
