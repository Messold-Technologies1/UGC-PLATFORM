import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBrief,
} from "../api/create-brief";
import type {
  CreateBriefPayload,
  CreateBriefResponse,
} from "../api/types";
import {
  briefDetailQueryKey,
} from "./use-get-brief-query";
import {
  briefsQueryKey,
} from "./use-list-briefs-query";
import { brandProfileStateQueryKey } from "@/features/brands/api/fetch-brand-profile-state";

type UseCreateBriefMutationOptions = UseMutationOptions<
  CreateBriefResponse,
  Error,
  CreateBriefPayload,
  unknown
>;

export function useCreateBriefMutation(
  options?: UseCreateBriefMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["briefs", "create"],
    mutationFn: createBrief,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({ queryKey: briefsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: briefDetailQueryKey(data.id),
      });
      await queryClient.invalidateQueries({
        queryKey: brandProfileStateQueryKey,
      });
      toast.success("Brief saved");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        const message = error.response.data.message;
        toast.error(Array.isArray(message) ? message[0] : String(message));
      } else {
        toast.error("Unable to save the brief right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
