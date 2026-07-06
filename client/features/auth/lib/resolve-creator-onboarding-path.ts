import type { AuthUser } from "@/features/auth/hooks/use-me-query";
import { getCreatorOnboardingMode } from "./creator-onboarding-mode";

function isCreatorWorkspaceUser(user: AuthUser): boolean {
  return (
    user.primaryRole === "CREATOR" || user.roles.includes("CREATOR")
  );
}

function callbackTargetsCreatorWorkspace(callbackUrl?: string | null): boolean {
  if (!callbackUrl?.trim()) return false;
  const path = callbackUrl.split("?")[0] ?? callbackUrl;
  return path.startsWith("/creator");
}

/**
 * Creator onboarding redirects only apply when the user is entering the creator
 * workspace — not merely because they also have a creator profile while their
 * primary role is brand (or another workspace).
 */
export function shouldApplyCreatorOnboarding(
  user: AuthUser,
  callbackUrl?: string | null,
): boolean {
  if (!isCreatorWorkspaceUser(user)) {
    return false;
  }
  if (user.primaryRole === "CREATOR") {
    return true;
  }
  return callbackTargetsCreatorWorkspace(callbackUrl);
}

/**
 * Returns a creator onboarding redirect path, or null when the user may proceed
 * to the normal workspace.
 */
export function resolveCreatorOnboardingPath(
  user: AuthUser,
  callbackUrl?: string | null,
): string | null {
  if (!shouldApplyCreatorOnboarding(user, callbackUrl)) {
    return null;
  }

  const status = user.creatorApprovalStatus;
  const complete = user.creatorProfileComplete === true;
  const mode = getCreatorOnboardingMode();

  if (mode === "profile_first") {
    if (status === "PENDING" && !complete) {
      return "/creator/settings/profile";
    }
    if (status === "PENDING" && complete) {
      return "/creator/under-review";
    }
    if (status === "APPROVED" && !complete) {
      return "/creator/settings/profile";
    }
    return null;
  }

  if (status === "PENDING") {
    return "/creator/under-review";
  }
  if (status === "APPROVED" && !complete) {
    return "/creator/settings/profile";
  }

  return null;
}
