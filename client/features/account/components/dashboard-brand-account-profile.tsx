"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BriefcaseBusiness,
  Globe,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/providers/auth-provider";
import {
  brandProfileStateQueryKey,
  fetchBrandProfileState,
} from "@/features/brands/api/fetch-brand-profile-state";

export function DashboardBrandAccountProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const profileQuery = useQuery({
    queryKey: brandProfileStateQueryKey,
    queryFn: fetchBrandProfileState,
    enabled: Boolean(user?.id && user.hasBrandProfile && !user.brandAccessRevoked),
    staleTime: 2 * 60_000,
    retry: false,
  });

  const profileState = profileQuery.data;
  const profile = profileState?.kind === "ready" ? profileState.profile : null;

  const headerDescription = useMemo(() => {
    if (user?.brandAccessRevoked) {
      return "Your brand access has been removed by admin.";
    }
    if (!user?.hasBrandProfile) {
      return "Your brand profile is not set up yet.";
    }
    if (profileQuery.isError) {
      return "We could not load your brand profile. Try again shortly.";
    }
    if (profileState?.kind === "missing") {
      return "Your brand profile is not set up yet.";
    }
    if (profileState?.kind === "revoked") {
      return "Your brand access has been removed by admin.";
    }
    return "Your brand profile details.";
  }, [
    profileState,
    profile,
    profileQuery.isError,
    user?.brandAccessRevoked,
    user?.hasBrandProfile,
  ]);

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (user.brandAccessRevoked || profileState?.kind === "revoked") {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader title="Profile" description={headerDescription} />
        </div>
      </div>
    );
  }

  if (user.hasBrandProfile && profileQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Profile" description={headerDescription} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {profile ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
                {profile.logoUrl ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted sm:size-24">
                    <Image
                      src={profile.logoUrl}
                      alt={`${profile.companyName} logo`}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                ) : (
                  <div
                    className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary sm:size-24"
                    aria-hidden
                  >
                    <BriefcaseBusiness className="size-9 opacity-80 sm:size-10" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {profile.companyName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Manage the details creators see for your brand.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/40 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Details
                </h3>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/brand/settings/profile">Edit</Link>
                </Button>
              </div>
              <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Company name
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {profile.companyName}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Website
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Globe className="size-4 opacity-70" aria-hidden />
                    <span className="break-all">
                      {profile.website ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-3">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Industry
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <BriefcaseBusiness className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {profile.industry ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 sm:col-span-2 xl:col-span-3">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Contact person
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <UserRound className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {profile.contactPerson ?? "—"}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Brand profile</p>
            <p className="text-sm text-muted-foreground">
              {profileQuery.isError
                ? "Profile data is unavailable right now."
                : "No profile data yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
