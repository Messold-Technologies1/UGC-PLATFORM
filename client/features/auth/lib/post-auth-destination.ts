import type { AuthUser, WorkspaceRole } from "../hooks/use-me-query";
import { resolveCreatorOnboardingPath } from "./resolve-creator-onboarding-path";
import { canUseWorkspaceRole } from "./workspace-defaulting";

export type PostAuthRole = "creator" | "brand" | "agency" | "admin";

const CREATOR_FALLBACK = "/creator/account";
const BRAND_FALLBACK = "/brand/creators";
const AGENCY_FALLBACK = "/agency/creators";
const ADMIN_FALLBACK = "/admin";

/**
 * Where a returning session lands when it opens the site at `/`.
 *
 * Kept separate from the post-login fallbacks above on purpose. Signing in is
 * an action with a destination in mind — often a callbackUrl — while reopening
 * the tab is "take me back to what I do here", and the two answers differ for
 * creators (the profile they are still filling in, rather than the account
 * page) and for admins (the creator queue they actually work from, rather than
 * the admin index). Sharing one constant would have made changing either one
 * silently change the other.
 */
const LANDING_CREATOR = "/creator/settings/profile";
const LANDING_BRAND = "/brand/creators";
const LANDING_AGENCY = "/agency/creators";
const LANDING_ADMIN = "/admin/creators";

/** Minimal identity used to pick a workspace home after login / session restore. */
export type LandingWorkspaceUser = {
  primaryRole?: string | null;
  roles?: readonly string[] | null;
};

function canUseLandingRole(
  user: LandingWorkspaceUser,
  role: string | null | undefined,
): boolean {
  if (!role) return false;
  if (role === "AGENCY") return true;
  return role === "BRAND" || role === "CREATOR" || role === "ADMIN";
}

function landingPathForRole(role: string | null | undefined): string | null {
  if (role === "ADMIN") return LANDING_ADMIN;
  if (role === "AGENCY") return LANDING_AGENCY;
  if (role === "BRAND") return LANDING_BRAND;
  if (role === "CREATOR") return LANDING_CREATOR;
  return null;
}

/**
 * Brand and agency → browse creators, creator → their profile, admin → the
 * creator queue. Returns null for a session with no workspace role, which is
 * how the caller knows to leave the visitor on the public page.
 */
export function resolveLandingWorkspacePath(
  user: LandingWorkspaceUser | null | undefined,
): string | null {
  if (!user) return null;
  if (canUseLandingRole(user, user.primaryRole)) {
    return landingPathForRole(user.primaryRole);
  }
  const fallbackRole = (user.roles ?? []).find((role) =>
    canUseLandingRole(user, role),
  );
  return fallbackRole ? landingPathForRole(fallbackRole) : null;
}

/** Paths where post-login should return the user (public browsing, not workspace). */
export function isPublicPostAuthContinuePath(path: string): boolean {
  return path.startsWith("/wishlists/share/");
}

function toPostAuthRole(r: WorkspaceRole): PostAuthRole {
  if (r === "ADMIN") return "admin";
  if (r === "CREATOR") return "creator";
  if (r === "AGENCY") return "agency";
  return "brand";
}

function firstAllowedWorkspaceRole(
  user: AuthUser,
  roles: Array<WorkspaceRole | null | undefined>,
): WorkspaceRole | null {
  for (const role of roles) {
    if (canUseWorkspaceRole(user, role ?? null)) {
      return role ?? null;
    }
  }
  return null;
}

export function resolvePostAuthRedirectPath(
  user: AuthUser,
  callbackUrl: string | null,
): string {
  if (user.roles.length === 0) {
    return postAuthContinuePath(callbackUrl);
  }
  if (user.roles.includes("ADMIN")) {
    return "/admin";
  }
  const role = firstAllowedWorkspaceRole(user, [
    user.primaryRole,
    ...user.roles,
  ]);

  if (role === "CREATOR") {
    const creatorOnboardingPath = resolveCreatorOnboardingPath(user, callbackUrl);
    if (creatorOnboardingPath) {
      return creatorOnboardingPath;
    }
  }

  if (!role) {
    return postAuthContinuePath(callbackUrl);
  }
  return postAuthDestinationForRole(toPostAuthRole(role), callbackUrl);
}

export type PathAfterWorkspaceSelectionOptions = {
  promptIncompleteProfileOnboarding?: boolean;
};

export function stripOnboardingFromHref(href: string): string {
  const q = href.indexOf("?");
  if (q === -1) return href;
  const path = href.slice(0, q);
  const params = new URLSearchParams(href.slice(q + 1));
  params.delete("onboarding");
  const rest = params.toString();
  return rest ? `${path}?${rest}` : path;
}

export function pathAfterWorkspaceSelection(
  user: AuthUser,
  role: WorkspaceRole,
  callbackUrl: string | null,
  options?: PathAfterWorkspaceSelectionOptions,
): string {
  if (!canUseWorkspaceRole(user, role)) {
    return resolvePostAuthRedirectPath(user, callbackUrl);
  }
  const dest = postAuthDestinationForRole(toPostAuthRole(role), callbackUrl);
  const promptOnboarding = options?.promptIncompleteProfileOnboarding !== false;

  if (!promptOnboarding) {
    return stripOnboardingFromHref(dest);
  }

  return dest;
}

export function postAuthDestinationForRole(
  role: PostAuthRole,
  callbackUrl: string | null,
): string {
  if (!callbackUrl?.trim()) {
    if (role === "admin") return ADMIN_FALLBACK;
    if (role === "creator") return CREATOR_FALLBACK;
    return role === "agency" ? AGENCY_FALLBACK : BRAND_FALLBACK;
  }
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    if (role === "admin") return ADMIN_FALLBACK;
    if (role === "creator") return CREATOR_FALLBACK;
    return role === "agency" ? AGENCY_FALLBACK : BRAND_FALLBACK;
  }
  const path = callbackUrl.split("?")[0] ?? callbackUrl;
  if (isPublicPostAuthContinuePath(path)) return callbackUrl;
  if (role === "admin" && path.startsWith("/admin")) return callbackUrl;
  if (role === "agency" && path.startsWith("/agency")) return callbackUrl;
  if (role === "brand" && path.startsWith("/brand")) return callbackUrl;
  if (role === "creator" && path.startsWith("/creator")) return callbackUrl;
  
  if (role === "admin") return ADMIN_FALLBACK;
  if (role === "creator") return CREATOR_FALLBACK;
  return role === "agency" ? AGENCY_FALLBACK : BRAND_FALLBACK;
}

export function postAuthContinuePath(callbackUrl: string | null): string {
  return "/";
}

export function withDashboardOnboarding(
  pathWithOptionalQuery: string,
  role: PostAuthRole,
): string {
  const [path, existing] = pathWithOptionalQuery.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set("onboarding", role);
  return `${path}?${params.toString()}`;
}
