import type { AuthUser } from "@/features/auth/hooks/use-me-query";
import { getCreatorOnboardingMode } from "./creator-onboarding-mode";

function isCreatorWorkspaceUser(user: AuthUser): boolean {
  return (
    user.primaryRole === "CREATOR" || user.roles.includes("CREATOR")
  );
}

/**
 * Returns a creator onboarding redirect path, or null when the user may proceed
 * to the normal workspace.
 */
export function resolveCreatorOnboardingPath(user: AuthUser): string | null {
  if (!isCreatorWorkspaceUser(user)) {
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
