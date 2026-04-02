"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Spinner } from "@/components/ui/spinner";
import {
  creatorProfileMeQueryKey,
  fetchCreatorProfileMe,
} from "@/features/creators/api/fetch-creator-profile-me";
import { getInitials } from "@/lib/account-user";
import { useAuth } from "@/providers/auth-provider";

export type DashboardAccountProfileProps = {
  profileEditHref: string;
};

export function DashboardAccountProfile({
  profileEditHref,
}: DashboardAccountProfileProps) {
  const { user } = useAuth();
  const profileQuery = useQuery({
    queryKey: creatorProfileMeQueryKey,
    queryFn: fetchCreatorProfileMe,
    enabled: Boolean(user?.hasCreatorProfile),
    staleTime: 2 * 60_000,
  });

  if (!user) return null;

  if (!user.hasCreatorProfile) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Profile"
          description="Complete creator onboarding from the dashboard first."
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-8 text-muted-foreground" aria-hidden />
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
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          {profile.gender?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Gender
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.gender.trim()}
              </dd>
            </div>
          ) : null}

          {profile.ageRange?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Age range
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.ageRange.trim()}
              </dd>
            </div>
          ) : null}

          {typeof profile.travelRadius === "number" ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Travel radius
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.travelRadius} km
              </dd>
            </div>
          ) : null}

          {profile.onLocationAvailable !== undefined ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                On-location available
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.onLocationAvailable ? "Yes" : "No"}
              </dd>
            </div>
          ) : null}

          {profile.onLocationFee?.trim() ? (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                On-location fee
              </dt>
              <dd className="mt-1 text-sm font-medium text-foreground">
                {profile.onLocationFee.trim()}
              </dd>
            </div>
          ) : null}

          {profile.languages.length ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Languages
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.languages.map((l) => (
                  <span
                    key={l.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {l.language}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}

          {profile.categories.length ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Categories
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {c.category}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}

          {profile.personaTags?.length ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Persona tags
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.personaTags.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {t.tag}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}

          {profile.restrictions?.length ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Restrictions
              </dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {profile.restrictions.map((r) => (
                  <span
                    key={r.id}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {r.restriction}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}

          {profile.packages.length ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">
                Packages
              </dt>
              <dd className="mt-2 space-y-2">
                {profile.packages.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-border bg-background/40 p-4"
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
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {p.deliverables.map((d, i) => (
                          <li key={`${p.id}-${i}`}>{d}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </div>
  );
}
