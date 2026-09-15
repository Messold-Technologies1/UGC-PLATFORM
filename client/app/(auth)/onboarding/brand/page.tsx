"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";
import { BrandGoogleSetupDialog } from "@/features/auth/components/brand-google-setup-dialog";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";

const BRAND_SETUP_PATH = "/onboarding/brand";

function BrandSetupInner() {
  const { data: user = null, isPending, isFetched } = useMeQuery();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [ready, setReady] = useState(false);

  const userId = user?.id ?? null;
  const hasBrandProfile = Boolean(user?.hasBrandProfile);
  const isBrand = Boolean(user?.roles.includes("BRAND"));

  useEffect(() => {
    if (isPending || !isFetched) return;
    if (!userId || !user) {
      beginClientNavigation();
      router.replace("/login");
      return;
    }
    if (hasBrandProfile) {
      const target = resolveImmediatePostAuthPath(user, callbackUrl);
      const targetPath = target.split("?")[0];
      if (targetPath === BRAND_SETUP_PATH) {
        setReady(true);
        return;
      }
      beginClientNavigation();
      router.replace(target);
      return;
    }
    if (!isBrand) {
      beginClientNavigation();
      router.replace("/");
      return;
    }
    setReady(true);
  }, [
    callbackUrl,
    hasBrandProfile,
    isBrand,
    isFetched,
    isPending,
    router,
    user,
    userId,
  ]);

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

export default function BrandOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <BrandSetupInner />
    </Suspense>
  );
}
