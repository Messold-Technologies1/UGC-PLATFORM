"use client";

import { Suspense, type ReactNode } from "react";
import { DashboardOnboardingGate } from "@/components/onboarding/dashboard-onboarding-gate";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";

export function PostLoginSetupShell({
  role,
  children,
}: {
  role: PostAuthRole;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-col">
      <Suspense fallback={null}>
        <DashboardOnboardingGate role={role} />
      </Suspense>
      {children}
    </div>
  );
}
