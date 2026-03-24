"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PostLoginRoleOverlay } from "@/components/ui/post-login-role-overlay";
import { selectWorkspaceApi } from "@/features/auth/api/select-workspace";
import {
  authMeQueryKey,
  type WorkspaceRole,
} from "@/features/auth/hooks/use-me-query";
import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
} from "@/features/auth/lib/post-auth-destination";
import { useAuth } from "@/providers/auth-provider";

export function AuthContinueOverlay() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
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

  const showPicker =
    Boolean(user) && !isLoading && user!.roles.length === 0;

  const runSelect = async (role: WorkspaceRole) => {
    if (!user) return;
    const returnToContinue = postAuthContinuePath(callbackUrl);
    const target = pathAfterWorkspaceSelection(user, role, callbackUrl);
    router.replace(target);
    try {
      const next = await selectWorkspaceApi(role);
      queryClient.setQueryData(authMeQueryKey, next);
    } catch {
      toast.error(
        role === "CREATOR"
          ? "Could not continue as creator. Try again."
          : "Could not continue as brand. Try again.",
      );
      router.replace(returnToContinue);
    }
  };

  return (
    <PostLoginRoleOverlay
      open={showPicker}
      dismissible={false}
      onContinueAsCreator={async () => {
        await runSelect("CREATOR");
      }}
      onContinueAsBrand={async () => {
        await runSelect("BRAND");
      }}
    />
  );
}
