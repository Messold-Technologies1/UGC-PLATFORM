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
import { useQueryClient } from "@tanstack/react-query";
import { GlobalOnboardingPage } from "@/components/onboarding/global-onboarding-page";
import type { PostAuthRole } from "@/features/auth/lib/post-auth-destination";
import type { WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import { useWorkspaceNavigation } from "@/features/auth/hooks/use-workspace-navigation";
import { useAuth } from "@/providers/auth-provider";

function hasWorkspaceRole(
  user: { roles: WorkspaceRole[] },
  role: WorkspaceRole,
): boolean {
  return user.roles.includes(role);
}

export type DashboardOnboardingGateProps = {
  role: PostAuthRole;
  children: ReactNode;
};

const PARAM = "onboarding";

function brandOverlayDismissStorageKey(userId: string) {
  return `ugc_brand_onboarding_overlay_dismissed_v2:${userId}`;
}

function readBrandOverlayDismissedFromStorage(userId: string | undefined) {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return (
      sessionStorage.getItem(brandOverlayDismissStorageKey(userId)) === "1"
    );
  } catch {
    return false;
  }
}

export function DashboardOnboardingGate({
  role,
  children,
}: DashboardOnboardingGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const { goWorkspace } = useWorkspaceNavigation();

  const [, bumpBrandDismissEpoch] = useState(0);

  const brandOverlayDismissed = readBrandOverlayDismissedFromStorage(user?.id);

  const paramRequestsOnboarding = useMemo(() => {
    const raw = searchParams.get(PARAM);
    return raw === role || raw === "1";
  }, [searchParams, role]);

  const { showCreatorBlockingOnboarding, showBrandBlockingOnboarding } =
    useMemo(() => {
      const creator =
        role === "creator" &&
        !isLoading &&
        !!user &&
        (!hasWorkspaceRole(user, "CREATOR") || !user.hasCreatorProfile);
      const brand =
        role === "brand" &&
        !isLoading &&
        !!user &&
        (!hasWorkspaceRole(user, "BRAND") ||
          (!user.hasBrandProfile && !brandOverlayDismissed));
      return {
        showCreatorBlockingOnboarding: creator,
        showBrandBlockingOnboarding: brand,
      };
    }, [role, isLoading, user, brandOverlayDismissed]);

  const showBlockingOnboarding =
    showCreatorBlockingOnboarding || showBrandBlockingOnboarding;

  const creatorBackRole = useMemo(() => {
    if (!user || role !== "creator") return null;
    if (hasWorkspaceRole(user, "BRAND")) return "BRAND" as const;
    return null;
  }, [role, user]);

  const replaceUrlWithoutOnboardingParam = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(PARAM);
    const q = next.toString();
    startTransition(() => {
      router.replace(q ? `${pathname}?${q}` : pathname);
    });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!paramRequestsOnboarding || showBlockingOnboarding) return;
    replaceUrlWithoutOnboardingParam();
  }, [
    paramRequestsOnboarding,
    showBlockingOnboarding,
    replaceUrlWithoutOnboardingParam,
  ]);

  const handleBrandDismiss = useCallback(() => {
    if (!user?.id) return;
    try {
      sessionStorage.setItem(brandOverlayDismissStorageKey(user.id), "1");
    } catch {}
    bumpBrandDismissEpoch((n) => n + 1);
  }, [user]);

  const handleCreatorBack = useCallback(() => {
    if (!creatorBackRole) return;
    void goWorkspace(creatorBackRole);
  }, [creatorBackRole, goWorkspace]);

  if (showBlockingOnboarding) {
    return (
      <GlobalOnboardingPage
        role={role}
        onClose={replaceUrlWithoutOnboardingParam}
        onBrandDismiss={handleBrandDismiss}
        onCreatorBack={creatorBackRole ? handleCreatorBack : undefined}
        creatorBackLabel={
          creatorBackRole === "BRAND" ? "Back to brand workspace" : undefined
        }
      />
    );
  }

  return <>{children}</>;
}
