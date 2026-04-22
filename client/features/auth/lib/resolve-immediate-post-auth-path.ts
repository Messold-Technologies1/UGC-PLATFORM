import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
} from "./post-auth-destination";
import { canUseWorkspaceRole } from "./workspace-defaulting";

export function resolveImmediatePostAuthPath(
  user: AuthUser,
  callbackUrl: string | null,
): string {
  if (user.roles.length === 0) {
    return postAuthContinuePath(callbackUrl);
  }

  if (user.primaryRole === "ADMIN") {
    return "/admin";
  }

  if (canUseWorkspaceRole(user, user.primaryRole)) {
    return pathAfterWorkspaceSelection(
      user,
      user.primaryRole as WorkspaceRole,
      callbackUrl,
    );
  }

  return postAuthContinuePath(callbackUrl);
}
