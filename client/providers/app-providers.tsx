"use client";

import { Suspense, type ReactNode } from "react";
import { NavigationProgress } from "@/components/navigation-progress";
import { WorkspaceSwitchingOverlay } from "@/components/workspace-switching-overlay";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";

export function AppShellProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <WorkspaceSwitchingOverlay />
      {children}
    </QueryProvider>
  );
}

export function PublicAppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function AuthenticatedAppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
