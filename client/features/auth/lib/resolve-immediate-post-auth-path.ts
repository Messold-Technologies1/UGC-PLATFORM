import type { QueryClient } from "@tanstack/react-query";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";
import { ensureWorkspaceSelection } from "./ensure-workspace-selection";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
} from "./post-auth-destination";
import {
  canUseWorkspaceRole,
  getRecoverableProfileRole,
} from "./workspace-defaulting";

function singleWorkspaceRole(user: AuthUser): WorkspaceRole | null {
  const roles = user.roles.filter((role) => role !== "ADMIN");
  return roles.length === 1 ? roles[0] ?? null : null;
}

export async function resolveImmediatePostAuthPath(
  queryClient: QueryClient,
  user: AuthUser,
  callbackUrl: string | null,
): Promise<string> {
  if (user.roles.length === 0) {
    return postAuthContinuePath(callbackUrl);
  }

  if (user.roles.includes("ADMIN")) {
    return "/admin";
  }

  if (canUseWorkspaceRole(user, user.primaryRole)) {
    const ok = await ensureWorkspaceSelection(
      queryClient,
      user,
      user.primaryRole,
    );
    if (!ok) {
      return postAuthContinuePath(callbackUrl);
    }

    const nextUser =
      queryClient.getQueryData<AuthUser | null>(authMeQueryKey) ?? user;
    return pathAfterWorkspaceSelection(nextUser, user.primaryRole, callbackUrl);
  }

  if (canUseWorkspaceRole(user, user.activeRole)) {
    return resolvePostAuthRedirectPath(user, callbackUrl);
  }

  const recoverableProfileRole = getRecoverableProfileRole(user);
  if (recoverableProfileRole) {
    const ok = await ensureWorkspaceSelection(
      queryClient,
      user,
      recoverableProfileRole,
      true,
    );
    if (!ok) {
      return postAuthContinuePath(callbackUrl);
    }

    const nextUser =
      queryClient.getQueryData<AuthUser | null>(authMeQueryKey) ?? user;
    return pathAfterWorkspaceSelection(
      nextUser,
      recoverableProfileRole,
      callbackUrl,
    );
  }

  const role = singleWorkspaceRole(user);
  if (!role) {
    return postAuthContinuePath(callbackUrl);
  }

  if (!canUseWorkspaceRole(user, role)) {
    return postAuthContinuePath(callbackUrl);
  }

  const ok = await ensureWorkspaceSelection(queryClient, user, role);
  if (!ok) {
    return postAuthContinuePath(callbackUrl);
  }

  const nextUser =
    queryClient.getQueryData<AuthUser | null>(authMeQueryKey) ?? user;
  return pathAfterWorkspaceSelection(nextUser, role, callbackUrl);
}
