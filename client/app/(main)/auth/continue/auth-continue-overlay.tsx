"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PostLoginRoleOverlay } from "@/components/ui/post-login-role-overlay";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import {
  authMeQueryKey,
  type AuthUser,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
} from "@/features/auth/lib/post-auth-destination";
import { ensureWorkspaceSelection } from "@/features/auth/lib/ensure-workspace-selection";
import { useAuth } from "@/providers/auth-provider";

export function AuthContinueOverlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl");
  const autoRedirectRef = useRef(false);
  const [pendingRole, setPendingRole] = useState<WorkspaceRole | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      autoRedirectRef.current = false;
      beginClientNavigation();
      router.replace("/login");
      return;
    }
    if (autoRedirectRef.current) return;
    if (user.roles.length === 0) {
      autoRedirectRef.current = false;
      return;
    }

    const activeRole = user.activeRole;
    if (activeRole) {
      autoRedirectRef.current = true;
      const path = resolvePostAuthRedirectPath(user, callbackUrl);
      if (path !== postAuthContinuePath(callbackUrl)) {
        beginClientNavigation();
        router.replace(path);
      } else {
        autoRedirectRef.current = false;
      }
      return;
    }

    if (user.roles.length === 1) {
      autoRedirectRef.current = true;
      void (async () => {
        const ok = await ensureWorkspaceSelection(queryClient, user, user.roles[0]);
        if (!ok) {
          autoRedirectRef.current = false;
          return;
        }
        const nextUser =
          queryClient.getQueryData<AuthUser | null>(authMeQueryKey) ?? user;
        const target = pathAfterWorkspaceSelection(
          nextUser,
          user.roles[0],
          callbackUrl,
        );
        beginClientNavigation();
        router.replace(target);
      })();
      return;
    }

    autoRedirectRef.current = false;
  }, [callbackUrl, isLoading, queryClient, router, user]);

  const showPicker =
    Boolean(user) &&
    !isLoading &&
    (user!.roles.length === 0 || (user!.roles.length > 1 && !user!.activeRole));

  const runSelect = useCallback(
    async (workspaceRole: WorkspaceRole) => {
      if (!user) return;
      setPendingRole(workspaceRole);
      const ok = await ensureWorkspaceSelection(queryClient, user, workspaceRole);
      if (!ok) {
        setPendingRole(null);
        return;
      }
      const nextUser =
        queryClient.getQueryData<AuthUser | null>(authMeQueryKey) ?? user;
      const target = pathAfterWorkspaceSelection(
        nextUser,
        workspaceRole,
        callbackUrl,
      );
      beginClientNavigation();
      router.replace(target);
    },
    [user, callbackUrl, queryClient, router],
  );

  const onContinueAsCreator = useCallback(() => {
    void runSelect("CREATOR");
  }, [runSelect]);

  const onContinueAsBrand = useCallback(() => {
    void runSelect("BRAND");
  }, [runSelect]);

  return (
    <PostLoginRoleOverlay
      open={showPicker}
      dismissible={false}
      onContinueAsCreator={onContinueAsCreator}
      onContinueAsBrand={onContinueAsBrand}
      pendingRole={pendingRole}
    />
  );
}
