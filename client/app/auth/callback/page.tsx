"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import {
  authMeQueryKey,
  fetchAuthMe,
  type AuthUser,
} from "@/features/auth/hooks/use-me-query";
import { postAuthContinuePath } from "@/features/auth/lib/post-auth-destination";
import { buildLoginHref } from "@/features/auth/lib/login-redirect";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";
import { consumeOAuthCallbackUrl } from "@/features/auth/lib/start-google-oauth";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const error = searchParams.get("error");
    const brandSetup = searchParams.get("brandSetup") === "1";
    const fromQuery = searchParams.get("callbackUrl");
    const storedCallback = consumeOAuthCallbackUrl();
    const callback = fromQuery || storedCallback;

    void (async () => {
      if (error) {
        const message =
          error === "missing_code_or_state"
            ? "Sign-in was incomplete. Try again."
            : "Google sign-in failed. Try again.";
        toast.error(message);
        beginClientNavigation();
        router.replace(callback ? buildLoginHref(callback) : "/login?role=brand");
        return;
      }

      await queryClient.fetchQuery({
        queryKey: authMeQueryKey,
        queryFn: fetchAuthMe,
      });
      const user = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);

      if (
        brandSetup ||
        (user?.roles.includes("BRAND") && !user.hasBrandProfile)
      ) {
        const qs = new URLSearchParams();
        if (callback) qs.set("callbackUrl", callback);
        const q = qs.toString();
        beginClientNavigation();
        router.replace(`/register/brand/complete${q ? `?${q}` : ""}`);
        return;
      }

      const target = user
        ? resolveImmediatePostAuthPath(user, callback)
        : postAuthContinuePath(callback);
      beginClientNavigation();
      router.replace(target);
    })();
  }, [queryClient, router, searchParams]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Spinner className="size-8 text-muted-foreground" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
