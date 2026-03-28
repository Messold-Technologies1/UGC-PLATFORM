"use client";

import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAuth } from "@/providers/auth-provider";

function displayName(user: { name: string | null; email: string }) {
  return user.name?.trim() || user.email.split("@")[0] || "Your name";
}

function initials(user: { name: string | null; email: string }) {
  const base = user.name?.trim() || user.email.split("@")[0] || "?";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase().slice(0, 2);
  }
  return base.slice(0, 2).toUpperCase();
}

function handleFromEmail(email: string) {
  const local = email.split("@")[0] ?? "user";
  return `@${local}`;
}

function roleSentence(
  active: "CREATOR" | "BRAND" | null,
  primary: "CREATOR" | "BRAND" | null,
) {
  const a = active ?? primary;
  if (a === "BRAND") return "Current role: Brand";
  if (a === "CREATOR") return "Current role: Creator";
  return "Current workspace: not set";
}

export function DashboardAccountProfile({
  profileEditHref,
}: {
  /** Creator: `/creator/settings/profile` (profile form). Brand: `/brand/settings` until a dedicated form exists. */
  profileEditHref: string;
}) {
  const { user } = useAuth();
  if (!user) return null;

  const name = displayName(user);
  const handle = handleFromEmail(user.email);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Your account details and workspace preferences."
      />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 gap-4 sm:gap-6">
            <div
              className="flex size-20 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-semibold text-primary sm:size-24 sm:text-3xl"
              aria-hidden
            >
              {initials(user)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {name}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{handle}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 opacity-80" aria-hidden />
                  Location not set
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4 shrink-0 opacity-80" aria-hidden />
                  Join date not available
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/90">
                {roleSentence(user.activeRole, user.primaryRole)}
              </p>
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
          Account details
        </h3>
        <dl className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Email</dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">User ID</dt>
            <dd className="mt-1 font-mono text-xs text-foreground break-all">
              {user.id}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Roles</dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.roles.length > 0
                ? user.roles.join(", ")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Active workspace
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.activeRole ?? user.primaryRole ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Creator profile
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.hasCreatorProfile ? "Complete" : "Not set up"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Brand profile
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {user.hasBrandProfile ? "Complete" : "Not set up"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
