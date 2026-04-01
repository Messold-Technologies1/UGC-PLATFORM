"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  authMeQueryKey,
  fetchAuthMe,
  type AuthUser,
} from "@/features/auth/hooks/use-me-query";
import { postAuthContinuePath } from "@/features/auth/lib/post-auth-destination";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  useEffect(() => {
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl");

    void (async () => {
      if (error) {
        const message =
          error === "missing_code_or_state"
            ? "Sign-in was incomplete. Try again."
            : "Google sign-in failed. Try again.";
        toast.error(message);
        router.replace("/login");
        return;
      }
      
      
      await queryClient.fetchQuery({
        queryKey: authMeQueryKey,
        queryFn: fetchAuthMe,
      });
      const user = queryClient.getQueryData<AuthUser | null>(authMeQueryKey);
      const target = user
        ? await resolveImmediatePostAuthPath(queryClient, user, callbackUrl)
        : postAuthContinuePath(callbackUrl);
      router.prefetch(target);
      router.replace(target);
    })();
  }, [queryClient, router, searchParams]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
