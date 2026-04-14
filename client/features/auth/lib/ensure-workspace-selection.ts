import type { QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  type AuthUser,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";
import { selectWorkspaceWithCache } from "@/features/auth/lib/select-workspace-with-cache";
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
  if (user.activeRole === role && (!setPrimary || user.primaryRole === role)) {
    return true;
  }
  try {
    await selectWorkspaceWithCache(queryClient, role, setPrimary);
    return true;
  } catch (err) {
    if (role === "BRAND" && isAxiosError(err) && err.response?.status === 403) {
      toast.error("Your brand access has been removed by admin.");
      return false;
    }
    toast.error(WORKSPACE_ERROR[role]);
    return false;
  }
}
