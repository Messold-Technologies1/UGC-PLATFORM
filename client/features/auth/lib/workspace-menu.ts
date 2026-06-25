import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import { canUseWorkspaceRole } from "./workspace-defaulting";

export type WorkspaceMenuRole = Extract<WorkspaceRole, "BRAND" | "CREATOR">;

function normalizeInternalHref(href?: string | null): string | null {
  const value = href?.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export function workspaceAccountHref(role: WorkspaceMenuRole): string {
  return role === "BRAND" ? "/brand/settings/profile" : "/creator/account";
}

export function canSwitchToWorkspace(
  user: AuthUser,
  role: WorkspaceMenuRole,
): boolean {
  if (role === "BRAND") {
    return (
      (user.roles.includes("BRAND") || user.roles.includes("AGENCY")) &&
      canUseWorkspaceRole(user, "BRAND")
    );
  }
  return user.roles.includes(role) && canUseWorkspaceRole(user, role);
}

export function canSetUpWorkspace(
  user: AuthUser,
  role: WorkspaceMenuRole,
): boolean {
  if (role === "BRAND") {
    return (
      !canSwitchToWorkspace(user, role) &&
      !user.hasBrandProfile &&
      !user.hasAgencyProfile &&
      !user.brandAccessRevoked
    );
  }

  return !canSwitchToWorkspace(user, role) && !user.hasCreatorProfile;
}

export function workspaceSetupHref(
  role: WorkspaceMenuRole,
  callbackUrl?: string | null,
): string {
  const params = new URLSearchParams();

  const safeCallbackUrl = normalizeInternalHref(callbackUrl);
  if (safeCallbackUrl) {
    params.set("callbackUrl", safeCallbackUrl);
  }

  const query = params.toString();
  const path = role === "BRAND" ? "/register/brand" : "/register/creator";
  return query ? `${path}?${query}` : path;
}
