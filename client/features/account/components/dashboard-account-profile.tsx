"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { getInitials } from "@/lib/account-user";
import { useAuth } from "@/providers/auth-provider";

export type DashboardAccountProfileProps = {
  profileEditHref: string;
};

export function DashboardAccountProfile({
  profileEditHref,
}: DashboardAccountProfileProps) {
  const { user } = useAuth();
  const profileQuery = useCreatorProfileMeQuery({
    enabled: Boolean(user?.hasCreatorProfile),
    staleTime: 2 * 60_000,
  });

  if (!user) return null;

  if (!user.hasCreatorProfile) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Profile"
          description="Complete creator onboarding from your workspace first."
        />
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <p className="text-sm text-muted-foreground">
            Your creator profile is not set up yet.
          </p>
          <Link
            href={profileEditHref}
            className="mt-4 inline-flex text-sm font-bold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            Set up profile
          </Link>
        </div>
      </div>
    );
  }

  if (profileQuery.isPending) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <Skeleton className="mb-2 h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
              <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />
              <div className="flex-1 space-y-3 py-2 sm:py-3">
                <Skeleton className="h-6 w-3/4 sm:w-1/3" />
                <Skeleton className="h-4 w-1/2 sm:w-1/4" />
                <Skeleton className="h-4 w-full sm:w-1/2" />
              </div>
            </div>
            <Skeleton className="h-5 w-10 sm:pt-1" />
          </div>
        </div>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Skeleton className="h-4 w-20" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:col-span-6 xl:grid-cols-6">
            <Skeleton className="h-20 rounded-xl xl:col-span-2" />
            <Skeleton className="h-20 rounded-xl xl:col-span-2" />
            <Skeleton className="h-20 rounded-xl xl:col-span-2" />
            <Skeleton className="h-24 rounded-xl xl:col-span-3" />
            <Skeleton className="h-24 rounded-xl xl:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data ?? null;
  if (profileQuery.isError || profile == null) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Profile"
          description="We could not load your creator profile. Try again shortly."
        />
      </div>
    );
  }
  const languageBadges =
    profile.profileLanguages?.length
      ? profile.profileLanguages.map((language) => ({
          id: language.id,
          label: language.label,
        }))
      : (profile.languages ?? []).map((language) => ({
          id: language.id,
          label: language.language,
        }));

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your creator profile details." />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
            {profile.profileImageUrl ? (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted sm:size-24">
                <Image
                  src={profile.profileImageUrl}
                  alt={profile.displayName}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
            ) : (
              <div
                className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary sm:size-24 sm:text-3xl"
                aria-hidden
              >
                {getInitials(profile.displayName)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {profile.displayName}
              </h2>
              {profile.city?.trim() ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin
                      className="size-4 shrink-0 opacity-80"
                      aria-hidden
                    />
                    {profile.city.trim()}
                  </span>
                </div>
              ) : null}
              {profile.bio?.trim() ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {profile.bio.trim()}
                </p>
              ) : null}
            </div>
          </div>
          <Link
            href={profileEditHref}
            className="shrink-0 text-sm font-bold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline sm:pt-1"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Details
        </h3>
        <div className="mt-6 grid gap-4 xl:grid-cols-6">
          <dl className="grid gap-4 sm:grid-cols-2 xl:col-span-6 xl:grid-cols-6">
            {profile.gender?.trim() ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  Gender
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {profile.gender.trim()}
                </dd>
              </div>
            ) : null}

            {profile.ageRange?.trim() ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  Age range
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {profile.ageRange.trim()}
                </dd>
              </div>
            ) : null}

            {typeof profile.travelRadius === "number" ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  Travel radius
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {profile.travelRadius} km
                </dd>
              </div>
            ) : null}

            {profile.onLocationAvailable !== undefined ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  On-location available
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {profile.onLocationAvailable ? "Yes" : "No"}
                </dd>
              </div>
            ) : null}

            {profile.onLocationFee?.trim() ? (
              <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-2">
                <dt className="text-xs font-medium text-muted-foreground">
                  On-location fee
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {profile.onLocationFee.trim()}
                </dd>
              </div>
            ) : null}
          </dl>

          {languageBadges.length ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-3">
              <h4 className="text-xs font-medium text-muted-foreground">
                Languages
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {languageBadges.map((l) => (
                  <span
                    key={l.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.categories.length ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-3">
              <h4 className="text-xs font-medium text-muted-foreground">
                Categories
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {c.category}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.personaTags?.length ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-3">
              <h4 className="text-xs font-medium text-muted-foreground">
                Persona tags
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.personaTags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {t.tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.restrictions?.length ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-3">
              <h4 className="text-xs font-medium text-muted-foreground">
                Restrictions
              </h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.restrictions.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {r.restriction}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.packages.length ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-6">
              <h4 className="text-xs font-medium text-muted-foreground">
                Packages
              </h4>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {profile.packages.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {p.name}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        ₹{p.priceAmount} · {p.deliveryDays} days
                      </p>
                    </div>
                    {p.deliverables.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {p.deliverables.map((d, i) => (
                          <li key={`${p.id}-${i}`}>{d}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {profile.addOns?.length ? (
            <div className="rounded-xl border border-border/70 bg-background/40 p-4 xl:col-span-6">
              <h4 className="text-xs font-medium text-muted-foreground">
                Add-ons
              </h4>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {profile.addOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {addOn.name}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground">
                        ₹{addOn.priceAmount}
                      </p>
                    </div>
                    {addOn.description?.trim() ? (
                      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                        {addOn.description.trim()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
