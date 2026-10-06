"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useMeQuery } from "@/features/auth/hooks/use-me-query";
import { AgencySetupDialog } from "@/features/auth/components/agency-setup-dialog";
import { beginClientNavigation } from "@/lib/client-navigation-state";
import { resolveImmediatePostAuthPath } from "@/features/auth/lib/resolve-immediate-post-auth-path";

function AgencySetupInner() {
  const { data: user = null, isPending, isFetched } = useMeQuery();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const userId = user?.id ?? null;
  const hasAgencyProfile = Boolean(user?.hasAgencyProfile);
  const isAgency = Boolean(user?.roles.includes("AGENCY"));

  useEffect(() => {
    if (isPending || !isFetched) return;
    if (!userId || !user) {
      beginClientNavigation();
      router.replace("/login");
      return;
    }
    if (hasAgencyProfile) {
      beginClientNavigation();
      router.replace(resolveImmediatePostAuthPath(user, callbackUrl));
      return;
    }
    if (!isAgency) {
      beginClientNavigation();
      router.replace("/");
      return;
    }
  }, [
    callbackUrl,
    hasAgencyProfile,
    isAgency,
    isFetched,
    isPending,
    router,
    user,
    userId,
  ]);

  if (!user || hasAgencyProfile || !isAgency) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return <AgencySetupDialog open user={user} callbackUrl={callbackUrl} />;
}

export default function AgencyOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center">
          <Spinner className="size-8 text-muted-foreground" />
        </div>
      }
    >
      <AgencySetupInner />
    </Suspense>
  );
}
