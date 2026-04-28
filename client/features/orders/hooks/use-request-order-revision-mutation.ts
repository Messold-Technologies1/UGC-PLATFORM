import { isAxiosError } from "axios";
import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  requestOrderRevision,
  type RequestOrderRevisionPayload,
} from "../api/request-order-revision";

type RequestOrderRevisionMutationOptions = UseMutationOptions<
  void,
  Error,
  RequestOrderRevisionPayload,
  unknown
>;

export function useRequestOrderRevisionMutation(
  options?: RequestOrderRevisionMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["orders", "request-revision"],
    mutationFn: requestOrderRevision,
    onSuccess: async (data, variables, onMutateResult, context) => {
      toast.success("Revision requested successfully");
      await queryClient.invalidateQueries({ queryKey: ["orders", "brand"] });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(String(error.response.data.message));
      } else {
        toast.error("Unable to request a revision right now");
      }

      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
