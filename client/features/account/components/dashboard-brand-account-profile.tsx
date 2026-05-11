"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { Globe, Mail, Phone, Store, UserRound, Instagram, Box, Volume2 } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/providers/auth-provider";
import { useBrandProfileStateQuery } from "@/features/brands/hooks/use-brand-profile-state-query";
import {
  BRAND_CATEGORY_LABEL,
  type BrandCategoryApi,
} from "@/features/brands/api/brand-category-types";

export function DashboardBrandAccountProfile() {
  const { user, isLoading: authLoading } = useAuth();

  const profileQuery = useBrandProfileStateQuery({
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
    profileQuery.isError,
    user?.brandAccessRevoked,
    user?.hasBrandProfile,
  ]);

  if (authLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <Skeleton className="mb-2 h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
              <Skeleton className="size-20 shrink-0 rounded-2xl sm:size-24" />
              <div className="flex-1 space-y-3 py-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Skeleton className="h-20 rounded-xl xl:col-span-2" />
              <Skeleton className="h-20 rounded-xl xl:col-span-2" />
              <Skeleton className="h-20 rounded-xl xl:col-span-2" />
              <Skeleton className="h-20 rounded-xl sm:col-span-2 xl:col-span-3" />
            </div>
          </div>
        </div>
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
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <Skeleton className="mb-2 h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8 space-y-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
              <Skeleton className="size-20 shrink-0 rounded-2xl sm:size-24" />
              <div className="flex-1 space-y-3 py-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/40 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <Skeleton className="h-20 rounded-xl xl:col-span-2" />
              <Skeleton className="h-20 rounded-xl xl:col-span-2" />
              <Skeleton className="h-20 rounded-xl xl:col-span-2" />
              <Skeleton className="h-20 rounded-xl sm:col-span-2 xl:col-span-3" />
            </div>
          </div>
        </div>
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
                      alt={`${profile.brandName} logo`}
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
                    <Store className="size-9 opacity-80 sm:size-10" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {profile.brandName}
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
                    {profile.brandName}
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

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Contact name
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <UserRound className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {profile.contactFullName ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Contact email
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Mail className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {profile.contactEmail ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Mobile
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Phone className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {profile.contactPhone ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Account email
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Mail className="size-4 opacity-70" aria-hidden />
                    <span className="wrap-break-word">
                      {profile.email ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Instagram
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Instagram className="size-4 opacity-70" aria-hidden />
                    <span className="break-all">
                      {profile.instagramUrl ? (
                        <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {profile.instagramUrl}
                        </a>
                      ) : "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Product type
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Box className="size-4 opacity-70" aria-hidden />
                    <span className="capitalize">
                      {profile.productType?.toLowerCase() ?? "—"}
                    </span>
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Brand pronunciation
                  </dt>
                  <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Volume2 className="size-4 opacity-70" aria-hidden />
                    <span>{profile.brandPronunciation ?? "—"}</span>
                    {profile.brandPronunciationAudioUrl && (
                      <audio controls src={profile.brandPronunciationAudioUrl} className="h-8 w-64 ml-2" />
                    )}
                  </dd>
                </div>

                <div className="rounded-xl border border-border/70 bg-card p-4 xl:col-span-6">
                  <dt className="text-xs font-medium text-muted-foreground">
                    Categories
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
                    {profile.categories?.length
                      ? profile.categories
                          .map(
                            (c) =>
                              BRAND_CATEGORY_LABEL[c as BrandCategoryApi] ?? c,
                          )
                          .join(", ")
                      : "—"}
                    {profile.otherCategoryLabel && (
                      <span className="text-muted-foreground">
                        ({profile.otherCategoryLabel})
                      </span>
                    )}
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
