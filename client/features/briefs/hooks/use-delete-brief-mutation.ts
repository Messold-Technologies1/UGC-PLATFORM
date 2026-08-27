import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteBrief } from "../api/delete-brief";
import { briefsQueryKey } from "./use-list-briefs-query";

type UseDeleteBriefMutationOptions = UseMutationOptions<
  void,
  Error,
  string,
  unknown
>;

export function useDeleteBriefMutation(
  options?: UseDeleteBriefMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["briefs", "delete"],
    mutationFn: deleteBrief,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: briefsQueryKey });
      toast.success("Brief deleted");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        const message = error.response.data.message;
        toast.error(Array.isArray(message) ? message[0] : String(message));
      } else {
        toast.error("Unable to delete the brief right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
