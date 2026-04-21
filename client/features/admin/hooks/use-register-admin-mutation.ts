import { isAxiosError } from "axios";
import {
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  registerAdmin,
  type RegisterAdminPayload,
} from "../api/register-admin";

type RegisterAdminResult = Awaited<ReturnType<typeof registerAdmin>>;

type RegisterAdminMutationOptions = UseMutationOptions<
  RegisterAdminResult,
  Error,
  RegisterAdminPayload,
  unknown
>;

function getRegisterAdminErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return message.join(", ");
    }

    if (error.message.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "An unexpected error occurred";
}

export function useRegisterAdminMutation(
  options?: RegisterAdminMutationOptions,
) {
  return useMutation({
    ...options,
    mutationKey: ["admin", "register-admin"],
    mutationFn: registerAdmin,
    onSuccess: (data, variables, onMutateResult, context) => {
      toast.success("Admin successfully created!");
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    onError: (error, variables, onMutateResult, context) => {
      toast.error(getRegisterAdminErrorMessage(error));
      options?.onError?.(error, variables, onMutateResult, context);
    },
  });
}
