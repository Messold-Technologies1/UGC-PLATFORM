"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";
import { BrandGoogleSetupDialog } from "@/features/auth/components/brand-google-setup-dialog";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";

function BrandCompleteInner() {
  const { data: user = null, isPending: isLoading } = useMeQuery();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      beginClientNavigation();
      router.replace("/login?role=brand");
      return;
    }
    if (user.hasBrandProfile) {
      beginClientNavigation();
      router.replace(resolveImmediatePostAuthPath(user, callbackUrl));
      return;
    }
    if (!user.roles.includes("BRAND")) {
      beginClientNavigation();
      router.replace("/");
      return;
    }
    setReady(true);
  }, [callbackUrl, isLoading, router, user]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <BrandGoogleSetupDialog open user={user} callbackUrl={callbackUrl} />
  );
}

export default function BrandCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <BrandCompleteInner />
    </Suspense>
  );
}
