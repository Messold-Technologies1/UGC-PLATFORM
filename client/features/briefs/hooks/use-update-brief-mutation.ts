import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { updateBrief, type UpdateBriefPayload } from "../api/update-brief";
import type { Brief } from "../api/types";
import { briefDetailQueryKey } from "./use-get-brief-query";
import { briefsQueryKey } from "./use-list-briefs-query";

interface UpdateBriefVariables {
  id: string;
  payload: UpdateBriefPayload;
}

type UseUpdateBriefMutationOptions = UseMutationOptions<
  Brief,
  Error,
  UpdateBriefVariables,
  unknown
>;

export function useUpdateBriefMutation(
  options?: UseUpdateBriefMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["briefs", "update"],
    mutationFn: ({ id, payload }: UpdateBriefVariables) =>
      updateBrief(id, payload),
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: briefsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: briefDetailQueryKey(variables.id),
      });
      toast.success("Brief updated");
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
