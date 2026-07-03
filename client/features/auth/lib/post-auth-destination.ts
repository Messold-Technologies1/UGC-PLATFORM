import type { AuthUser, WorkspaceRole } from "../hooks/use-me-query";
import { resolveCreatorOnboardingPath } from "./resolve-creator-onboarding-path";
import { canUseWorkspaceRole } from "./workspace-defaulting";

export type PostAuthRole = "creator" | "brand" | "admin";

const CREATOR_FALLBACK = "/creator/account";
const BRAND_FALLBACK = "/brand/creators";
const ADMIN_FALLBACK = "/admin";

/** Paths where post-login should return the user (public browsing, not workspace). */
export function isPublicPostAuthContinuePath(path: string): boolean {
  return path.startsWith("/wishlists/share/");
}

function toPostAuthRole(r: WorkspaceRole): PostAuthRole {
  if (r === "ADMIN") return "admin";
  if (r === "CREATOR") return "creator";
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
    return role === "creator" ? CREATOR_FALLBACK : BRAND_FALLBACK;
  }
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    if (role === "admin") return ADMIN_FALLBACK;
    return role === "creator" ? CREATOR_FALLBACK : BRAND_FALLBACK;
  }
  const path = callbackUrl.split("?")[0] ?? callbackUrl;
  if (isPublicPostAuthContinuePath(path)) return callbackUrl;
  if (role === "admin" && path.startsWith("/admin")) return callbackUrl;
  if (role === "brand" && path.startsWith("/brand")) return callbackUrl;
  if (role === "creator" && path.startsWith("/creator")) return callbackUrl;
  
  if (role === "admin") return ADMIN_FALLBACK;
  return role === "creator" ? CREATOR_FALLBACK : BRAND_FALLBACK;
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
