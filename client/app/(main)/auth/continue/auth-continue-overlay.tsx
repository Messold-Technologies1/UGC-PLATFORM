"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import {
  postAuthContinuePath,
} from "@/features/auth/lib/post-auth-destination";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { useAuth } from "@/providers/auth-provider";

export function AuthContinueOverlay() {
  const searchParams = useSearchParams();
  const { user, isLoading, refreshUser } = useAuth();
  const callbackUrl = searchParams.get("callbackUrl");
 
  const resetKey = [
    callbackUrl ?? "",
    user?.id ?? "",
    user?.primaryRole ?? "",
    user?.brandAccessRevoked ? "revoked" : "active",
  ].join("::");

  return (
    <AuthContinueOverlayContent
      key={resetKey}
      callbackUrl={callbackUrl}
      isLoading={isLoading}
      user={user}
    />
  );
}

function AuthContinueOverlayContent({
  callbackUrl,
  isLoading,
  user,
}: {
  callbackUrl: string | null;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
}) {
  const router = useRouter();
  const autoRedirectRef = useRef(false);

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

    autoRedirectRef.current = true;
    const target = resolveImmediatePostAuthPath(user, callbackUrl);
    if (target !== postAuthContinuePath(callbackUrl)) {
      beginClientNavigation();
      router.replace(target);
      return;
    }
    autoRedirectRef.current = false;
  }, [callbackUrl, isLoading, router, user]);

  return null;
}

