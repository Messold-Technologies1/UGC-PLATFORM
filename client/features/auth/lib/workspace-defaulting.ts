import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";

export function canUseWorkspaceRole(
  user: AuthUser,
  role: WorkspaceRole | null | undefined,
): role is WorkspaceRole {
  if (!role) return false;
  if (role === "AGENCY") {
    return user.hasAgencyProfile;
  }
  if (role === "BRAND") {
    return user.hasBrandProfile;
  }
  return true;
}

/** Brand or agency buyer can use the buyer workspace (orders, wishlists, etc.). */
export function userCanUseBrandWorkspace(user: AuthUser): boolean {
  if (user.roles.includes("AGENCY") && user.hasAgencyProfile) {
    return true;
  }
  return user.roles.includes("BRAND") && user.hasBrandProfile;
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
