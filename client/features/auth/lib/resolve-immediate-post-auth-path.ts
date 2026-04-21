import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
} from "./post-auth-destination";
import {
  canUseWorkspaceRole,
  getRecoverableProfileRole,
} from "./workspace-defaulting";

function singleWorkspaceRole(user: AuthUser): WorkspaceRole | null {
  const roles = user.roles.filter((role) => role !== "ADMIN");
  return roles.length === 1 ? roles[0] ?? null : null;
}

export function resolveImmediatePostAuthPath(
  user: AuthUser,
  callbackUrl: string | null,
): string {
  if (user.roles.length === 0) {
    return postAuthContinuePath(callbackUrl);
  }

  if (user.roles.includes("ADMIN")) {
    return "/admin";
  }

  if (canUseWorkspaceRole(user, user.primaryRole)) {
    return pathAfterWorkspaceSelection(user, user.primaryRole, callbackUrl);
  }

  const recoverableProfileRole = getRecoverableProfileRole(user);
  if (recoverableProfileRole) {
    return pathAfterWorkspaceSelection(user, recoverableProfileRole, callbackUrl);
  }

  const role = singleWorkspaceRole(user);
  if (!role) {
    return postAuthContinuePath(callbackUrl);
  }

  if (!canUseWorkspaceRole(user, role)) {
    return postAuthContinuePath(callbackUrl);
  }

  return pathAfterWorkspaceSelection(user, role, callbackUrl);
}
