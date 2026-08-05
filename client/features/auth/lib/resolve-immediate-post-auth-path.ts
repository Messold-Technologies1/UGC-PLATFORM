import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import { resolveCreatorOnboardingPath } from "./resolve-creator-onboarding-path";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
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

  // Brand Google signup / incomplete brand: finish brand name (+ optional phone/logo).
  if (
    (user.primaryRole === "BRAND" || user.roles.includes("BRAND")) &&
    !user.hasBrandProfile
  ) {
    return `/register/brand/complete${
      callbackUrl
        ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
        : ""
    }`;
  }

  const creatorOnboardingPath = resolveCreatorOnboardingPath(user, callbackUrl);
  if (creatorOnboardingPath) {
    return creatorOnboardingPath;
  }

  if (canUseWorkspaceRole(user, user.primaryRole)) {
    return pathAfterWorkspaceSelection(
      user,
      user.primaryRole as WorkspaceRole,
      callbackUrl,
    );
  }

  return resolvePostAuthRedirectPath(user, callbackUrl);
}
