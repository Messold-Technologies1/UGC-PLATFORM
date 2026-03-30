"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PostLoginRoleOverlay } from "@/components/ui/post-login-role-overlay";
import { type WorkspaceRole } from "@/features/auth/hooks/use-me-query";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
} from "@/features/auth/lib/post-auth-destination";
import { useAuth } from "@/providers/auth-provider";

export function AuthContinueOverlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl");
  const autoRedirectRef = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      autoRedirectRef.current = false;
      router.replace("/login");
      return;
    }
    if (user.roles.length === 0) {
      autoRedirectRef.current = false;
      return;
    }
    if (autoRedirectRef.current) return;
    autoRedirectRef.current = true;
    const path = resolvePostAuthRedirectPath(user, callbackUrl);
    if (path !== postAuthContinuePath(callbackUrl)) {
      router.replace(path);
    } else {
      autoRedirectRef.current = false;
    }
  }, [callbackUrl, isLoading, router, user]);

  const showPicker = Boolean(user) && !isLoading && user!.roles.length === 0;

  const runSelect = useCallback(
    (workspaceRole: WorkspaceRole) => {
      if (!user) return;
      const target = pathAfterWorkspaceSelection(user, workspaceRole, callbackUrl);
      router.replace(target);
    },
    [user, callbackUrl, router],
  );

  const onContinueAsCreator = useCallback(() => {
    runSelect("CREATOR");
  }, [runSelect]);

  const onContinueAsBrand = useCallback(() => {
    runSelect("BRAND");
  }, [runSelect]);

  return (
    <PostLoginRoleOverlay
      open={showPicker}
      dismissible={false}
      onContinueAsCreator={onContinueAsCreator}
      onContinueAsBrand={onContinueAsBrand}
    />
  );
}
