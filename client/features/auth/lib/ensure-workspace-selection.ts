import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";
const WORKSPACE_ERROR: Record<WorkspaceRole, string> = {
  CREATOR: "Could not continue as creator. Try again.",
  BRAND: "Could not continue as brand. Try again.",
  ADMIN: "Could not continue as admin. Try again.",
};

export async function ensureWorkspaceSelection(
  queryClient: QueryClient,
  user: AuthUser | null | undefined,
  role: WorkspaceRole,
  setPrimary?: boolean,
): Promise<boolean> {
  if (!user) return true;
  if (user.activeRole === role) return true;
  try {
    const next = await selectWorkspaceApi(role, setPrimary);
    queryClient.setQueryData(authMeQueryKey, next);
    return true;
  } catch {
    toast.error(WORKSPACE_ERROR[role]);
    return false;
  }
}
