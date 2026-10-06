import type { AuthUser, WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import { canUseWorkspaceRole } from "./workspace-defaulting";

export type WorkspaceMenuRole = Extract<
  WorkspaceRole,
  "BRAND" | "CREATOR" | "AGENCY"
>;

function normalizeInternalHref(href?: string | null): string | null {
  const value = href?.trim();
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export function workspaceAccountHref(role: WorkspaceMenuRole): string {
  if (role === "BRAND") return "/brand/settings/profile";
  if (role === "AGENCY") return "/agency/settings/profile";
  return "/creator/account";
}

/** Resolve which workspace the account menu should treat as active. */
export function resolveActiveWorkspace(
  pathname: string,
  user: AuthUser,
): WorkspaceRole | null {
  if (pathname === "/agency" || pathname.startsWith("/agency/")) {
    return "AGENCY";
  }
  if (pathname === "/brand" || pathname.startsWith("/brand/")) {
    // Agency users reuse some /brand routes (orders, messages) — keep agency
    // account context so Profile opens the agency settings page.
    if (
      user.primaryRole === "AGENCY" ||
      (user.hasAgencyProfile && !user.hasBrandProfile)
    ) {
      return "AGENCY";
    }
    return "BRAND";
  }
  if (pathname === "/creator" || pathname.startsWith("/creator/")) {
    return "CREATOR";
  }
  return user.primaryRole ?? null;
}

export function canSwitchToWorkspace(
  user: AuthUser,
  role: WorkspaceMenuRole,
): boolean {
  if (role === "AGENCY") {
    return user.roles.includes("AGENCY") && canUseWorkspaceRole(user, "AGENCY");
  }
  if (role === "BRAND") {
    return (
      user.roles.includes("BRAND") &&
      canUseWorkspaceRole(user, "BRAND")
    );
  }
  return user.roles.includes(role) && canUseWorkspaceRole(user, role);
}

export function canSetUpWorkspace(
  user: AuthUser,
  _role: WorkspaceMenuRole,
): boolean {
  // One email = one workspace. The only remaining setup is finishing
  // creator/brand/agency choice after unified signup.
  return user.roles.length === 0 && !user.primaryRole;
}

export function workspaceSetupHref(
  _role: WorkspaceMenuRole,
  callbackUrl?: string | null,
): string {
  const params = new URLSearchParams();

  const safeCallbackUrl = normalizeInternalHref(callbackUrl);
  if (safeCallbackUrl) {
    params.set("callbackUrl", safeCallbackUrl);
  }

  const query = params.toString();
  const path = "/onboarding/role";
  return query ? `${path}?${query}` : path;
}
