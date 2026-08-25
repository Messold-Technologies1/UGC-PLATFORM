"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { isProfileFirstOnboardingMode } from "@/features/auth/lib/creator-onboarding-mode";

const PROFILE_SETTINGS_PREFIX = "/creator/settings/profile";
const ACCOUNT_PREFIX = "/creator/account";
const UNDER_REVIEW_PATH = "/creator/under-review";

function isAllowedWhileOnboarding(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith(PROFILE_SETTINGS_PREFIX) ||
    pathname.startsWith(ACCOUNT_PREFIX) ||
    pathname === UNDER_REVIEW_PATH
  );
}

/**
 * In profile-first mode, keeps creators on the right onboarding routes until
 * admin approval and profile completion are satisfied.
 * Account + profile settings stay reachable so they can edit while under review.
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
    const allowed = isAllowedWhileOnboarding(pathname);

    if (status === "PENDING" && !complete && !allowed) {
      router.replace(PROFILE_SETTINGS_PREFIX);
      return;
    }

    // SELF_COMPLETED is an internal admin gate — the creator has submitted
    // everything, so they see the same "under review" screen as PENDING.
    if ((status === "PENDING" || status === "SELF_COMPLETED") && complete && !allowed) {
      router.replace(UNDER_REVIEW_PATH);
    }
  }, [isLoading, pathname, router, user]);

  return children;
}
