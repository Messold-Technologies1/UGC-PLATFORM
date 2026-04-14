import { isAxiosError } from "axios";
import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  submitBrief,
  type SubmitBriefPayload,
} from "../api/submit-brief";

type SubmitBriefMutationOptions = UseMutationOptions<
  void,
  Error,
  SubmitBriefPayload,
  unknown
>;

export function useSubmitBriefMutation(
  options?: SubmitBriefMutationOptions,
) {
  return useMutation({
    ...options,
    mutationKey: ["orders", "submit-brief"],
    mutationFn: submitBrief,
    onSuccess: (data, variables, onMutateResult, context) => {
      toast.success("Brief submitted successfully");
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
