"use client";

import { Suspense, type ReactNode } from "react";
import { DashboardOnboardingGate } from "@/components/onboarding/dashboard-onboarding-gate";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";

const dashboardContentClass: Record<PostAuthRole, string> = {
  creator: "mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8",
  /** Full width of main column (beside sidebar) for marketplace-style pages. */
  brand:
    "w-full max-w-none px-4 pt-4 pb-8 sm:px-6 lg:px-8 xl:px-10 2xl:px-12",
};

export function PostLoginSetupShell({
  role,
  children,
}: {
  role: PostAuthRole;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <Suspense fallback={null}>
        <DashboardOnboardingGate role={role}>
          <div className={dashboardContentClass[role]}>{children}</div>
        </DashboardOnboardingGate>
      </Suspense>
    </div>
  );
}
