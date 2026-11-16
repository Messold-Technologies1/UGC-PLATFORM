"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { formatEventTime } from "../lib/format-event-time";
import { nicheTint } from "../lib/niche-tint";
import type { FeedCreatorEventApi } from "../api/types";

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function formatPrice(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export function EventFeedCard({ event }: { event: FeedCreatorEventApi }) {
  const { creator } = event;
  const tint = nicheTint(creator.categories[0]);
  const profileHref = `/${creator.publicSlug}`;
  const hasRating = Boolean(creator.avgRating) && creator.reviewCount > 0;

  return (
    <article className="overflow-hidden rounded-gc-lg border border-border bg-card shadow-pop">
      {/* Identity band, tinted by primary niche. A column of text-only posts
          needs some rhythm, and the creator's own niche is the one true thing
          available to colour it with. */}
      <div
        className="flex flex-wrap items-center gap-3.5 px-5 py-3.5 sm:px-6"
        style={{ backgroundColor: tint.band }}
      >
        <Link
          href={profileHref}
          className="size-11 shrink-0 overflow-hidden rounded-full bg-gc-ink text-white"
          aria-label={`View ${creator.name}'s profile`}
        >
          {creator.profileImageUrl ? (
            <Image
              src={creator.profileImageUrl}
              alt=""
              width={44}
              height={44}
              className="size-11 object-cover"
            />
          ) : (
            <span className="flex size-11 items-center justify-center text-base font-bold">
              {initial(creator.name)}
            </span>
          )}
        </Link>

        <div className="min-w-50 flex-[999_1_0]">
          <div className="flex flex-wrap items-center gap-2">
            {/* The public slug, never a real name — the same identity brands
                see everywhere else on GoCollab. */}
            <Link
              href={profileHref}
              className="text-base font-extrabold tracking-tight text-gc-ink hover:underline"
            >
              {creator.name}
            </Link>
            {creator.categories[0] ? (
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-bold text-white"
                style={{ backgroundColor: tint.pill }}
              >
                {creator.categories[0]}
              </span>
            ) : null}
          </div>
          <div
            className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold"
            style={{ color: tint.ink }}
          >
            {creator.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {creator.city}
              </span>
            ) : null}
            {creator.city ? <span aria-hidden="true">·</span> : null}
            <time dateTime={event.createdAt}>
              {formatEventTime(event.createdAt)}
            </time>
            {event.editedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>edited</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5">
          {hasRating ? (
            <>
              <Star
                className="size-3.5 fill-gc-brand text-gc-brand"
                aria-hidden="true"
              />
              <span className="text-[13px] font-extrabold tabular-nums text-gc-ink">
                {Number(creator.avgRating).toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-gc-ink-muted">
                · {creator.ordersCompleted} order
                {creator.ordersCompleted === 1 ? "" : "s"}
              </span>
            </>
          ) : (
            <span className="text-xs font-bold text-gc-ink-muted">
              New creator
            </span>
          )}
        </div>
      </div>

      {/* The post is the point of the card: nothing competes with it. */}
      <div className="px-5 pt-5 sm:px-6">
        <p className="whitespace-pre-line text-[17px] leading-[1.7] tracking-[-0.005em] text-foreground">
          {event.body}
        </p>
      </div>

      <div className="mx-5 mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4 pb-4.5 sm:mx-6">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
          {creator.startingPrice !== null ? (
            <span className="text-sm font-extrabold tracking-tight tabular-nums">
              from {formatPrice(creator.startingPrice)}
            </span>
          ) : null}
          {creator.deliveryDays !== null ? (
            <span className="text-xs font-semibold text-gc-muted">
              {creator.deliveryDays}-day delivery
            </span>
          ) : null}
          {creator.onLocationShoot ? (
            <span className="rounded-full bg-gc-success-soft px-2.5 py-1 text-[11px] font-bold text-gc-success-ink">
              Travels for shoots
            </span>
          ) : null}
          {creator.firstOrderFree ? (
            <span className="rounded-full bg-gc-tint-amber px-2.5 py-1 text-[11px] font-bold text-[#8a4d12]">
              First order free
            </span>
          ) : null}
        </div>

        <Link
          href={profileHref}
          className="inline-flex min-h-10.5 items-center gap-1.5 rounded-full bg-gc-ink px-5 text-[13px] font-bold text-white hover:opacity-90"
        >
          View profile
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
