"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { useCreatorProfileMeQuery } from "@/features/creators/hooks/use-creator-profile-me-query";
import { useMyEventQuotaQuery } from "../hooks/use-my-events-query";
import { CREATOR_EVENT_DAILY_LIMIT } from "../lib/constants";

/**
 * The Events page has no heading, so the rail carries the orientation: where
 * a creator's public page lives, how much they have posted, and what makes a
 * post worth reading.
 */
export function CreatorEventsRail() {
  const { data: profile } = useCreatorProfileMeQuery();
  const { data: quota } = useMyEventQuotaQuery();
  const [copied, setCopied] = useState(false);

  const slug = profile?.publicSlug ?? null;
  const profilePath = slug ? `/${slug}` : null;
  const displayUrl = slug
    ? `${typeof window === "undefined" ? "" : window.location.host}/${slug}`
    : null;

  async function copyLink() {
    if (!profilePath) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${profilePath}`,
      );
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  const postedToday = quota?.postedToday ?? 0;

  return (
    <aside className="flex min-w-0 flex-[1_1_18rem] flex-col gap-4">
      {profilePath ? (
        <section className="rounded-gc-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">Your public page</h2>
          <div className="mb-3 flex items-center gap-2.5 rounded-gc-sm border border-border bg-muted px-3.5 py-2.5">
            <Link2
              className="size-3.5 shrink-0 text-gc-muted"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gc-ink-soft">
              {displayUrl ?? profilePath}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full border border-border bg-card text-[13px] font-bold text-gc-ink-soft hover:bg-muted"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={profilePath}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-full bg-gc-ink text-[13px] font-bold text-white hover:opacity-90"
            >
              View page
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-gc-lg border border-border bg-card p-5">
        <h2 className="mb-3.5 text-sm font-extrabold">Today</h2>
        <div className="mb-3.5 rounded-gc-md bg-muted px-4 py-3.5">
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">
            {postedToday}
            <span className="text-base font-bold text-gc-muted">
              {" "}
              / {CREATOR_EVENT_DAILY_LIMIT}
            </span>
          </p>
          <p className="mt-0.5 text-xs font-semibold text-gc-muted">
            posts in the last 24 hours
          </p>
        </div>
        <p className="text-xs leading-relaxed text-gc-muted">
          The limit keeps the brand feed readable — it resets as your older
          posts age past 24 hours.
        </p>
      </section>

      <section className="rounded-gc-lg border border-border bg-gc-surface-alt p-5">
        <h2 className="mb-3 text-sm font-extrabold">What works well</h2>
        <ul className="flex flex-col gap-2.5">
          {[
            "Where you'll be, and when you're back.",
            "What you can shoot there — that's what makes a brand reach out.",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2.5">
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-gc-brand"
                aria-hidden="true"
              />
              <span className="text-[13px] leading-relaxed text-gc-ink-soft">
                {tip}
              </span>
            </li>
          ))}
          <li className="flex items-start gap-2.5">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-gc-brand"
              aria-hidden="true"
            />
            <span className="text-[13px] leading-relaxed text-gc-ink-soft">
              Posting doesn&rsquo;t pause your orders or change your
              availability — set those in{" "}
              <Link href="/creator/settings/profile" className="text-deep-pink underline">
                Settings
              </Link>
              .
            </span>
          </li>
        </ul>
      </section>
    </aside>
  );
}
