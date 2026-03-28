"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalOnboardingPage } from "@/components/onboarding/global-onboarding-page";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";
import { useAuth } from "@/providers/auth-provider";

export type DashboardOnboardingGateProps = {
  role: PostAuthRole;
  children: ReactNode;
};

const PARAM = "onboarding";
const BRAND_OVERLAY_DISMISS_KEY = "ugc_brand_onboarding_overlay_dismissed_v1";

export function DashboardOnboardingGate({
  role,
  children,
}: DashboardOnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const [brandOverlayDismissed, setBrandOverlayDismissed] = useState(false);

  useEffect(() => {
    try {
      setBrandOverlayDismissed(
        sessionStorage.getItem(BRAND_OVERLAY_DISMISS_KEY) === "1",
      );
    } catch {
      setBrandOverlayDismissed(false);
    }
  }, []);

  const paramRequestsOnboarding = useMemo(() => {
    const raw = searchParams.get(PARAM);
    return raw === role || raw === "1";
  }, [searchParams, role]);

  const profileComplete =
    !isLoading &&
    !!user &&
    (role === "creator"
      ? user.hasCreatorProfile
      : user.hasBrandProfile);

  /** First-time creator: full-screen overlay until profile exists (POST create). */
  const showCreatorBlockingOnboarding =
    role === "creator" &&
    !isLoading &&
    !!user &&
    !user.hasCreatorProfile;

  /**
   * Brand profile is not exposed via API yet; allow a session dismiss so users
   * are not trapped behind an empty overlay forever.
   */
  const showBrandBlockingOnboarding =
    role === "brand" &&
    !isLoading &&
    !!user &&
    !user.hasBrandProfile &&
    !brandOverlayDismissed;

  const showBlockingOnboarding =
    showCreatorBlockingOnboarding || showBrandBlockingOnboarding;

  useEffect(() => {
    if (!paramRequestsOnboarding) return;
    if (showBlockingOnboarding) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete(PARAM);
    const q = next.toString();
    startTransition(() => {
      router.replace(q ? `${pathname}?${q}` : pathname);
    });
  }, [
    paramRequestsOnboarding,
    showBlockingOnboarding,
    pathname,
    router,
    searchParams,
  ]);

  const clearParam = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(PARAM);
    const q = next.toString();
    startTransition(() => {
      router.replace(q ? `${pathname}?${q}` : pathname);
    });
  }, [pathname, router, searchParams]);

  const handleBrandDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(BRAND_OVERLAY_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setBrandOverlayDismissed(true);
  }, []);

  if (showBlockingOnboarding) {
    return (
      <GlobalOnboardingPage
        role={role}
        onClose={clearParam}
        onBrandDismiss={handleBrandDismiss}
      />
    );
  }

  return <>{children}</>;
}
