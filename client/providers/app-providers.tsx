"use client";

import { Suspense, type ReactNode } from "react";
import { NavigationProgress } from "@/components/navigation-progress";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ActiveBrandProvider } from "@/providers/active-brand-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";

export function AppShellProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <TooltipProvider>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </TooltipProvider>
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

import { NotificationProvider } from "@/providers/notification-provider";
import { PushBootstrap } from "@/features/push/components/push-bootstrap";

export function AuthenticatedAppProviders({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthProvider>
      <ActiveBrandProvider>
        <NotificationProvider>
          <RealtimeProvider>
            {/* Renders nothing; keeps this browser's subscription alive. */}
            <PushBootstrap />
            {children}
          </RealtimeProvider>
        </NotificationProvider>
      </ActiveBrandProvider>
    </AuthProvider>
  );
}
