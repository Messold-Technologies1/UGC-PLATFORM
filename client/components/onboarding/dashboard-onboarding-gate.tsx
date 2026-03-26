"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GlobalOnboardingOverlay } from "@/components/onboarding/global-onboarding-overlay";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";

export type DashboardOnboardingGateProps = {
  role: PostAuthRole;
};

const PARAM = "onboarding";

export function DashboardOnboardingGate({
  role,
}: DashboardOnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = useMemo(() => {
    const raw = searchParams.get(PARAM);
    return raw === role || raw === "1";
  }, [searchParams, role]);

  const clearParam = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(PARAM);
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <GlobalOnboardingOverlay open={open} role={role} onClose={clearParam} />
  );
}
