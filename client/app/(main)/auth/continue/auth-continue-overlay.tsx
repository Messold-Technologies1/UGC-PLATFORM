"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  useRouter,
  useSearchParams,
  type ReadonlyURLSearchParams,
} from "next/navigation";
import { toast } from "sonner";
import { GlobalOnboardingPage } from "@/components/onboarding/global-onboarding-page";
import { PostLoginRoleOverlay } from "@/components/ui/post-login-role-overlay";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { type WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
} from "@/features/auth/lib/post-auth-destination";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { canUseWorkspaceRole } from "@/features/auth/lib/workspace-defaulting";
import { useAuth } from "@/providers/auth-provider";
import {
  AUTH_CONTINUE_SETUP_ROLE_PARAM,
  parseAuthContinueSetupRole,
} from "./setup-role";

function replaceAuthContinueSearchParam(
  searchParams: ReadonlyURLSearchParams,
  key: string,
  value: string | null,
): string {
  const next = new URLSearchParams(searchParams.toString());
  if (value) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  const query = next.toString();
  return query ? `/auth/continue?${query}` : "/auth/continue";
}

export function AuthContinueOverlay() {
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl");
  const setupRole = parseAuthContinueSetupRole(
    searchParams.get(AUTH_CONTINUE_SETUP_ROLE_PARAM),
  );
  const resetKey = [
    callbackUrl ?? "",
    user?.id ?? "",
    user?.primaryRole ?? "",
    user?.brandAccessRevoked ? "revoked" : "active",
    user?.roles.join("|") ?? "",
  ].join("::");

  return (
    <AuthContinueOverlayContent
      key={resetKey}
      callbackUrl={callbackUrl}
      isLoading={isLoading}
      searchParams={searchParams}
      setupRole={setupRole}
      user={user}
    />
  );
}

function AuthContinueOverlayContent({
  callbackUrl,
  isLoading,
  searchParams,
  setupRole,
  user,
}: {
  callbackUrl: string | null;
  isLoading: boolean;
  searchParams: ReadonlyURLSearchParams;
  setupRole: "brand" | "creator" | null;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const router = useRouter();
  const autoRedirectRef = useRef(false);
  const [pendingRole, setPendingRole] = useState<WorkspaceRole | null>(null);
  const [pickerDismissed, setPickerDismissed] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      autoRedirectRef.current = false;
      beginClientNavigation();
      router.replace("/login");
      return;
    }
    if (setupRole) {
      autoRedirectRef.current = false;
      return;
    }
    if (autoRedirectRef.current) return;
    if (user.roles.length === 0) {
      autoRedirectRef.current = false;
      return;
    }

    autoRedirectRef.current = true;
    const target = resolveImmediatePostAuthPath(user, callbackUrl);
    if (target !== postAuthContinuePath(callbackUrl)) {
      beginClientNavigation();
      router.replace(target);
      return;
    }
    autoRedirectRef.current = false;
  }, [callbackUrl, isLoading, router, setupRole, user]);

  const showPicker =
    Boolean(user) &&
    !isLoading &&
    !pickerDismissed &&
    setupRole === null &&
    (user!.roles.length === 0 ||
      (user!.roles.filter((role) => role !== "ADMIN").length > 1 &&
        !canUseWorkspaceRole(user!, user!.primaryRole)));

  const clearSetupRole = useCallback(() => {
    setPendingRole(null);
    router.replace(
      replaceAuthContinueSearchParam(
        searchParams,
        AUTH_CONTINUE_SETUP_ROLE_PARAM,
        null,
      ),
    );
  }, [router, searchParams]);

  const runSelect = useCallback(
    async (workspaceRole: WorkspaceRole) => {
      if (!user) return;
      if (user.roles.length === 0) {
        setPendingRole(workspaceRole);
        beginClientNavigation();
        router.replace(
          replaceAuthContinueSearchParam(
            searchParams,
            AUTH_CONTINUE_SETUP_ROLE_PARAM,
            workspaceRole === "BRAND" ? "brand" : "creator",
          ),
        );
        return;
      }

      if (!user.roles.includes(workspaceRole) || !canUseWorkspaceRole(user, workspaceRole)) {
        toast.error(`Could not continue as ${workspaceRole.toLowerCase()}.`);
        return;
      }

      setPendingRole(workspaceRole);
      const target = pathAfterWorkspaceSelection(user, workspaceRole, callbackUrl);
      beginClientNavigation();
      router.replace(target);
    },
    [user, callbackUrl, router, searchParams],
  );

  const onContinueAsCreator = useCallback(() => {
    void runSelect("CREATOR");
  }, [runSelect]);

  const onContinueAsBrand = useCallback(() => {
    void runSelect("BRAND");
  }, [runSelect]);

  if (setupRole) {
    return (
      <GlobalOnboardingPage
        role={setupRole}
        onClose={clearSetupRole}
        onCreatorBack={
          setupRole === "creator" ? clearSetupRole : undefined
        }
      />
    );
  }

  return (
    <PostLoginRoleOverlay
      open={showPicker}
      onOpenChange={(open) => {
        if (open) {
          setPickerDismissed(false);
          return;
        }
        setPendingRole(null);
        setPickerDismissed(true);
      }}
      dismissible
      onContinueAsCreator={onContinueAsCreator}
      onContinueAsBrand={onContinueAsBrand}
      pendingRole={pendingRole}
    />
  );
}
