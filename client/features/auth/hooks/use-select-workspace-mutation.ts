"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { selectWorkspaceWithCache } from "@/features/auth/lib/select-workspace-with-cache";
import type { AuthUser, WorkspaceRole } from "./use-me-query";

export type SelectWorkspaceVariables = {
  role: WorkspaceRole;
  setPrimary?: boolean;
};

type SelectWorkspaceMutationOptions = UseMutationOptions<
  AuthUser,
  Error,
  SelectWorkspaceVariables,
  unknown
>;

export function useSelectWorkspaceMutation(
  options?: SelectWorkspaceMutationOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    ...options,
    mutationKey: ["auth", "select-workspace"],
    mutationFn: ({ role, setPrimary }) =>
      selectWorkspaceWithCache(queryClient, role, setPrimary),
  });
}
