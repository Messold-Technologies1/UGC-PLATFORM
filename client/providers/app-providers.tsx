"use client";

import { Suspense, type ReactNode } from "react";
import { NavigationProgress } from "@/components/navigation-progress";
import { WorkspaceSwitchingOverlay } from "@/components/workspace-switching-overlay";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";

export function AppProviders({
  children,
  withAuth = false,
}: {
  children: ReactNode;
  withAuth?: boolean;
}) {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <WorkspaceSwitchingOverlay />
      {withAuth ? <AuthProvider>{children}</AuthProvider> : children}
    </QueryProvider>
  );
}
