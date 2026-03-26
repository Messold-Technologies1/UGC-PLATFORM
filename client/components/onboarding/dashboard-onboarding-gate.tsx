"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
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

export function DashboardOnboardingGate({
  role,
  children,
}: DashboardOnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  /** Full-screen setup only on settings so dashboard can show overview + banner. */
  const pathnameAllowsFullPageOnboarding = useMemo(() => {
    const prefix = `/${role}`;
    return pathname === `${prefix}/settings`;
  }, [pathname, role]);

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

  const showFullPageOnboarding =
    paramRequestsOnboarding &&
    pathnameAllowsFullPageOnboarding &&
    !profileComplete;

  useEffect(() => {
    if (!paramRequestsOnboarding) return;
    if (pathnameAllowsFullPageOnboarding && !profileComplete) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete(PARAM);
    const q = next.toString();
    startTransition(() => {
      router.replace(q ? `${pathname}?${q}` : pathname);
    });
  }, [
    paramRequestsOnboarding,
    pathnameAllowsFullPageOnboarding,
    profileComplete,
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

  if (!showFullPageOnboarding) {
    return <>{children}</>;
  }

  return <GlobalOnboardingPage role={role} onClose={clearParam} />;
}
