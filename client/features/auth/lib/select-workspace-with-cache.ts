import type { QueryClient } from "@tanstack/react-query";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";

export async function selectWorkspaceWithCache(
  queryClient: QueryClient,
  role: WorkspaceRole,
  setPrimary?: boolean,
): Promise<AuthUser> {
  const nextUser = await selectWorkspaceApi(role, setPrimary);
  queryClient.setQueryData(authMeQueryKey, nextUser);
  return nextUser;
}
