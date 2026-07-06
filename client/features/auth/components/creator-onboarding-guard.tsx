"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";

const PROFILE_SETTINGS_PREFIX = "/creator/settings/profile";
const UNDER_REVIEW_PATH = "/creator/under-review";

/**
 * In profile-first mode, keeps creators on the right onboarding routes until
 * admin approval and profile completion are satisfied.
 */
export function CreatorOnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user || !isProfileFirstOnboardingMode()) {
      return;
    }

    const isCreatorPrimary = user.primaryRole === "CREATOR";
    if (!isCreatorPrimary) {
      return;
    }

    const status = user.creatorApprovalStatus;
    const complete = user.creatorProfileComplete === true;
    const onProfileSettings = pathname?.startsWith(PROFILE_SETTINGS_PREFIX);
    const onUnderReview = pathname === UNDER_REVIEW_PATH;

    if (status === "PENDING" && !complete && !onProfileSettings) {
      router.replace(PROFILE_SETTINGS_PREFIX);
      return;
    }

    if (status === "PENDING" && complete && !onUnderReview && !onProfileSettings) {
      router.replace(UNDER_REVIEW_PATH);
    }
  }, [isLoading, pathname, router, user]);

  return children;
}
