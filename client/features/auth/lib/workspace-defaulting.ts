import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";

export function canUseWorkspaceRole(
  user: AuthUser,
  role: WorkspaceRole | null | undefined,
): role is WorkspaceRole {
  if (!role) return false;
  return role !== "BRAND" || !user.brandAccessRevoked;
}

export function getRecoverableProfileRole(user: AuthUser): WorkspaceRole | null {
  if (user.primaryRole) return null;

  const profileRoles: WorkspaceRole[] = [];

  if (user.hasCreatorProfile && canUseWorkspaceRole(user, "CREATOR")) {
    profileRoles.push("CREATOR");
  }

  if (user.hasBrandProfile && canUseWorkspaceRole(user, "BRAND")) {
    profileRoles.push("BRAND");
  }

  return profileRoles.length === 1 ? profileRoles[0] : null;
}
