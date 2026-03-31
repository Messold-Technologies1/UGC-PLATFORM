"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  BriefcaseBusiness,
  Globe,
  KeyRound,
  Loader2,
  UserRound,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/auth-provider";
import {
  brandProfileMeQueryKey,
  fetchBrandProfileMe,
} from "@/features/brands/api/fetch-brand-profile-me";

export function DashboardBrandAccountProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const profileQuery = useQuery({
    queryKey: brandProfileMeQueryKey,
    queryFn: fetchBrandProfileMe,
    enabled: Boolean(user?.id && user.hasBrandProfile),
    staleTime: 2 * 60_000,
    retry: false,
  });

  const staticProfile = {
    companyName: "Acme Inc.",
    logoKey: "brand-logo-",
    website: "https://acme.com",
    industry: "Skincare",
    contactPerson: "Jane (Marketing Lead)",
    logoUrl: null as string | null,
  };

  const profile = profileQuery.data ?? null;
  const displayProfile = profile ?? staticProfile;
  const hasLoadedProfile = true;

  const headerDescription = useMemo(() => {
    if (!user?.hasBrandProfile) {
      return "Your brand profile is not set up yet.";
    }
    if (profileQuery.isError || (!profileQuery.isPending && !profile)) {
      return "We could not load your brand profile. Try again shortly.";
    }
    return "Your brand profile details.";
  }, [
    profile,
    profileQuery.isError,
    profileQuery.isPending,
    user?.hasBrandProfile,
  ]);

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  if (user.hasBrandProfile && profileQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader title="Profile" description={headerDescription} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {hasLoadedProfile ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
                {displayProfile.logoUrl ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted sm:size-24">
                    <Image
                      src={displayProfile.logoUrl}
                      alt={`${displayProfile.companyName} logo`}
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
                    {displayProfile.companyName}
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
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Company name
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground">
                    {displayProfile.companyName}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Logo key
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <KeyRound className="size-4 opacity-70" aria-hidden />
                    <span className="break-all">
                      {displayProfile.logoKey ?? "—"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Website
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Globe className="size-4 opacity-70" aria-hidden />
                    <span className="break-all">
                      {displayProfile.website ?? "—"}
                    </span>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Industry
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <BriefcaseBusiness className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {displayProfile.industry ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Contact person
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <UserRound className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {displayProfile.contactPerson ?? "—"}
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
              {user.hasBrandProfile
                ? "Profile data is unavailable right now."
                : "No profile data yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
