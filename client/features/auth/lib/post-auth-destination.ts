import type { AuthUser, WorkspaceRole } from "../hooks/use-me-query";

export type PostAuthRole = "creator" | "brand";

const CREATOR_FALLBACK = "/creator/dashboard";
const BRAND_FALLBACK = "/brand/dashboard";

function toPostAuthRole(r: WorkspaceRole): PostAuthRole {
  return r === "CREATOR" ? "creator" : "brand";
}

/** After login/OAuth: skip role picker when the user already has a workspace role. */
export function resolvePostAuthRedirectPath(
  user: AuthUser,
  callbackUrl: string | null,
): string {
  if (user.roles.length === 0) {
    return postAuthContinuePath(callbackUrl);
  }
  const role = user.activeRole ?? user.primaryRole ?? user.roles[0];
  if (!role) {
    return postAuthContinuePath(callbackUrl);
  }
  const dest = postAuthDestinationForRole(toPostAuthRole(role), callbackUrl);
  if (role === "CREATOR" && !user.hasCreatorProfile) {
    return withDashboardOnboarding(dest, "creator");
  }
  if (role === "BRAND" && !user.hasBrandProfile) {
    return withDashboardOnboarding(dest, "brand");
  }
  return dest;
}

export function pathAfterWorkspaceSelection(
  user: AuthUser,
  role: WorkspaceRole,
  callbackUrl: string | null,
): string {
  const dest = postAuthDestinationForRole(toPostAuthRole(role), callbackUrl);
  if (role === "CREATOR" && !user.hasCreatorProfile) {
    return withDashboardOnboarding(dest, "creator");
  }
  if (role === "BRAND" && !user.hasBrandProfile) {
    return withDashboardOnboarding(dest, "brand");
  }
  return dest;
}

export function postAuthDestinationForRole(
  role: PostAuthRole,
  callbackUrl: string | null,
): string {
  if (!callbackUrl?.trim()) {
    return role === "creator" ? CREATOR_FALLBACK : BRAND_FALLBACK;
  }
  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return role === "creator" ? CREATOR_FALLBACK : BRAND_FALLBACK;
  }
  const path = callbackUrl.split("?")[0] ?? callbackUrl;
  if (role === "brand" && path.startsWith("/brand")) return callbackUrl;
  if (role === "creator" && path.startsWith("/creator")) return callbackUrl;
  return role === "creator" ? CREATOR_FALLBACK : BRAND_FALLBACK;
}

export function postAuthContinuePath(callbackUrl: string | null): string {
  const params = new URLSearchParams();
  if (callbackUrl) params.set("callbackUrl", callbackUrl);
  const q = params.toString();
  return q ? `/auth/continue?${q}` : "/auth/continue";
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
