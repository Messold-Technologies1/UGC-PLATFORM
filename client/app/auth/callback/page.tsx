"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl") ?? "/brand/dashboard";

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
      await refreshUser();
      router.replace(callbackUrl);
    })();
  }, [router, searchParams, refreshUser]);

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
