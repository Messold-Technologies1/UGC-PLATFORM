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
};

/**
 * Ensures the session active workspace matches `role` (e.g. after onboarding gate
 * when the user opened the other hub). Skips the request only when `activeRole`
 * already matches.
 *
 * Returns `true` on skip, on success, or when `user` is missing. Returns `false`
 * on API failure (toast shown).
 */
export async function ensureWorkspaceSelection(
  queryClient: QueryClient,
  user: AuthUser | null | undefined,
  role: WorkspaceRole,
): Promise<boolean> {
  if (!user) return true;
  if (user.activeRole === role) return true;
  try {
    const next = await selectWorkspaceApi(role);
    queryClient.setQueryData(authMeQueryKey, next);
    return true;
  } catch {
    toast.error(WORKSPACE_ERROR[role]);
    return false;
  }
}
