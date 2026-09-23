import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";

export function canUseWorkspaceRole(
  user: AuthUser,
  role: WorkspaceRole | null | undefined,
): role is WorkspaceRole {
  if (!role) return false;
  if (role === "AGENCY") {
    return user.hasAgencyProfile && user.accessibleBrands.length > 0;
  }
  if (role === "BRAND") {
    if (user.brandAccessRevoked && user.roles.includes("BRAND")) {
      return false;
    }
    return (
      user.hasBrandProfile ||
      (user.hasAgencyProfile && user.accessibleBrands.length > 0) ||
      user.accessibleBrands.length > 0
    );
  }
  return true;
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

  if (user.hasAgencyProfile && canUseWorkspaceRole(user, "AGENCY")) {
    profileRoles.push("AGENCY");
  }

  return profileRoles.length === 1 ? profileRoles[0] : null;
}
