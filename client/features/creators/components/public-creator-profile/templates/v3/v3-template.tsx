"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Play, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaViewer } from "../shared/media-viewer";
import type { PublicProfileViewModel } from "../types";

/** Niche pill tints, cycled so adjacent categories stay visually distinct. */
const CATEGORY_TINTS = [
  "bg-gc-tint-rose text-gc-tint-rose-ink",
  "bg-gc-tint-mint text-gc-tint-mint-ink",
  "bg-gc-tint-violet text-gc-tint-violet-ink",
  "bg-gc-tint-sky text-gc-tint-sky-ink",
  "bg-gc-tint-amber text-gc-tint-amber-ink",
];

/**
 * Column span for an About tile on the 6-column desktop grid: rows with many
 * values get more room so chips do not wrap awkwardly.
 */
function factSpan(valueCount: number): string {
  if (valueCount > 2) return "lg:col-span-6";
  if (valueCount === 2) return "lg:col-span-3";
  return "lg:col-span-2";
}

type TemplateProps = { model: PublicProfileViewModel };

export function V3Template({ model }: TemplateProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { audience, reviews, selectedPackage } = model;
  const bioIsLong = (model.bio?.length ?? 0) > 220;
  const priceLabel = selectedPackage?.priceLabel ?? "—";

  const termChips = selectedPackage
    ? [
        `${selectedPackage.deliveryLabel} delivery`,
        `${selectedPackage.lengthLabel} video`,
        `${selectedPackage.revisionsLabel} revisions`,
      ]
    : [];

  const openBooking = () => {
    setViewerIndex(null);
    setSheetOpen(true);
    document
      .getElementById("pricing")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white font-figtree text-gc-ink antialiased">
      {/* ------------------------------------------------------------ header */}
      <header className="sticky top-0 z-40 border-b border-gc-line bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-18 max-w-[1280px] items-center justify-between gap-4 px-5 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
            <img
              src="/brand-logo.png"
              alt="GoCollab"
              className="h-9 w-auto object-contain object-left sm:h-10"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Share this profile"
              onClick={() => {
                void navigator.share?.({ url: window.location.href }).catch(
                  () => {
                    // Share sheet dismissed, or unsupported — nothing to do.
                  },
                );
              }}
              className="hidden size-11 items-center justify-center rounded-full border border-gc-line text-gc-ink transition hover:bg-gc-surface sm:flex"
            >
              <Share2 className="size-[18px]" />
            </button>
            <button
              type="button"
              onClick={openBooking}
              className="h-11 whitespace-nowrap rounded-full bg-gc-ink px-5 text-sm font-bold text-white transition hover:bg-gc-ink-soft"
            >
              Book · {priceLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1280px] flex-wrap items-start gap-8 px-5 pb-28 pt-7 sm:px-6 lg:pb-24">
        <main className="flex min-w-0 flex-1 basis-[620px] flex-col gap-12 lg:gap-16">
          {/* -------------------------------------------------------- creator */}
          <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap items-center gap-2.5">
                {model.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                  <img
                    src={model.avatarUrl}
                    alt=""
                    className="size-11 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-full bg-gc-surface text-sm font-bold text-gc-muted">
                    {model.initials}
                  </span>
                )}
                {model.creatorTypeLabel && (
                  <span className="text-[15px] text-gc-muted">
                    {model.creatorTypeLabel}
                  </span>
                )}
                {model.verified && (
                  <span className="flex items-center gap-1.5 rounded-full bg-gc-success-soft py-1.5 pl-1.5 pr-3 text-[13px] font-semibold text-gc-success-ink">
                    <span className="flex size-4 items-center justify-center rounded-full bg-gc-success text-white">
                      <Check className="size-2.5" strokeWidth={3.5} />
                    </span>
                    Verified
                  </span>
                )}
              </div>

              <h1 className="m-0 text-[clamp(2.75rem,6vw,5rem)] font-light leading-[0.95] tracking-[-0.045em]">
                {model.headlineLead && `${model.headlineLead} `}
                <b className="font-extrabold">{model.headlineTail}</b>
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-base text-gc-ink-muted">
                {model.locationLabel && <span>{model.locationLabel}</span>}
                {model.locationLabel && model.languagesInline && (
                  <span className="text-gc-muted-faint">•</span>
                )}
                {model.languagesInline && <span>{model.languagesInline}</span>}
              </div>

              {model.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {model.categories.map((category, index) => (
                    <span
                      key={category}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-semibold",
                        CATEGORY_TINTS[index % CATEGORY_TINTS.length],
                      )}
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ------------------------------------------------------ overview */}
            <div className="grid gap-3 sm:grid-cols-3 sm:grid-rows-[minmax(200px,auto)_200px]">
              {model.intro && (
                <button
                  type="button"
                  onClick={() => setViewerIndex(0)}
                  className="group relative min-h-[320px] overflow-hidden rounded-gc-xl bg-gc-surface-alt text-left sm:row-span-2 sm:min-h-[420px]"
                >
                  {model.intro.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote S3 thumbnail
                    <img
                      src={model.intro.thumbnailUrl}
                      alt=""
                      className="absolute inset-0 size-full object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <video
                      src={model.intro.videoUrl}
                      className="absolute inset-0 size-full object-cover object-[center_25%]"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent to-45%" />
                  <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-3 py-1.5 text-[13px] font-semibold">
                    Intro
                  </span>
                  <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
                    <Play className="size-5 fill-gc-ink text-gc-ink" />
                  </span>
                  <span className="absolute bottom-3.5 left-4 text-[15px] font-semibold text-white">
                    Watch intro
                  </span>
                </button>
              )}

              {model.bio && (
                <div className="flex flex-col gap-2.5 rounded-gc-xl bg-[linear-gradient(120deg,#FFE3EA_0%,#F1E6FF_55%,#FFEBDD_100%)] p-6 sm:col-span-2">
                  <span className="text-[13px] font-semibold text-gc-muted">
                    Bio
                  </span>
                  <p
                    className={cn(
                      "m-0 text-pretty text-lg leading-[1.55] text-gc-ink-soft",
                      bioIsLong && !bioOpen && "line-clamp-4",
                    )}
                  >
                    {model.bio}
                  </p>
                  {bioIsLong && (
                    <button
                      type="button"
                      onClick={() => setBioOpen((open) => !open)}
                      className="h-8.5 self-start rounded-full bg-white/85 px-3.5 text-sm font-semibold text-gc-ink"
                    >
                      {bioOpen ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}

              {selectedPackage && (
                <div className="flex flex-col justify-between gap-6 rounded-gc-xl bg-gc-ink p-5 text-white">
                  <span className="flex size-9.5 items-center justify-center rounded-full bg-white/10">
                    <Clock className="size-[18px]" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-[2.125rem] font-extrabold leading-none tracking-[-0.035em]">
                      {selectedPackage.deliveryLabel}
                    </span>
                    <span className="text-[15px] text-white/70">
                      Delivery · {selectedPackage.revisionsLabel} revisions ·{" "}
                      {selectedPackage.lengthLabel} video
                    </span>
                  </span>
                </div>
              )}

              {audience && (
                <a
                  href="#audience"
                  className="relative flex flex-col justify-between rounded-gc-xl bg-gc-surface p-5 text-gc-ink"
                >
                  <span className="text-[13px] text-gc-muted">
                    Instagram followers
                  </span>
                  <span className="text-[3.25rem] font-extrabold leading-none tracking-[-0.045em]">
                    {audience.followersLabel}
                  </span>
                  <span className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white text-[15px]">
                    ↓
                  </span>
                </a>
              )}
            </div>
          </section>

          {/* ------------------------------------------------------ portfolio */}
          {model.portfolio.length > 0 && (
            <section>
              <div className="mb-4.5 flex items-baseline justify-between">
                <h2 className="m-0 text-[2.125rem] font-light tracking-[-0.03em]">
                  Selected <b className="font-extrabold">work</b>
                </h2>
                <span className="text-[15px] text-gc-muted-soft">
                  {model.portfolioCountLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))]">
                {model.portfolio.map((item) => {
                  const viewerPosition = model.media.findIndex(
                    (entry) => entry.id === item.id,
                  );
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setViewerIndex(Math.max(viewerPosition, 0))}
                      className="group relative aspect-[9/16] overflow-hidden rounded-gc-lg bg-gc-surface-alt"
                    >
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote S3 thumbnail
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <video
                          src={item.videoUrl}
                          className="absolute inset-0 size-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                      <span className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent to-40%" />
                      <span className="absolute left-1/2 top-1/2 flex size-13 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90">
                        <Play className="size-4 fill-gc-ink text-gc-ink" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------- about */}
          <section>
            <h2 className="mb-4.5 mt-0 text-[2.125rem] font-light tracking-[-0.03em]">
              About <b className="font-extrabold">this creator</b>
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {model.facts.map((fact) => {
                const Icon = fact.icon;
                const isSingle = fact.values.length === 1;
                return (
                  <div
                    key={fact.key}
                    className={cn(
                      "flex min-h-33 flex-col gap-4 rounded-gc-lg bg-gc-surface p-5 transition-transform duration-200 hover:-translate-y-0.5",
                      factSpan(fact.values.length),
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gc-brand-soft">
                        <Icon className="size-[18px] text-gc-brand" />
                      </span>
                      <span className="text-sm font-semibold text-gc-muted">
                        {fact.label}
                      </span>
                    </div>
                    {isSingle ? (
                      <div className="mt-auto flex items-center gap-2 text-[21px] font-bold leading-tight tracking-[-0.015em]">
                        {fact.key === "ON_LOCATION" && (
                          <span
                            className={cn(
                              "size-2.5 shrink-0 rounded-full",
                              fact.available
                                ? "bg-gc-success"
                                : "bg-gc-muted-faint",
                            )}
                          />
                        )}
                        {fact.values[0]}
                      </div>
                    ) : (
                      <div className="mt-auto flex flex-wrap gap-1.5">
                        {fact.values.map((value) => (
                          <span
                            key={value}
                            className="rounded-full bg-gc-brand-soft px-3.5 py-1.5 text-[15px] font-semibold text-gc-ink"
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {model.openTo.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3.5 rounded-gc-lg bg-[#1C1A1F] p-5 text-white lg:col-span-6">
                  <div className="flex shrink-0 items-center gap-2.5">
                    <span className="flex size-10 items-center justify-center rounded-full bg-white/10">
                      <Check className="size-[18px] text-gc-brand-muted" />
                    </span>
                    <span className="text-sm font-semibold text-white/75">
                      Open to
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {model.openTo.map((item) => (
                      <span
                        key={item}
                        className="flex h-11 items-center gap-2.5 rounded-full bg-white/8 pl-2.5 pr-4 text-[15px]"
                      >
                        <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-gc-brand-muted text-gc-ink">
                          <Check className="size-3" strokeWidth={3.5} />
                        </span>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ------------------------------------------------------- audience */}
          {audience && (
            <section id="audience" className="scroll-mt-24">
              <div className="mb-4.5 flex items-baseline justify-between">
                <h2 className="m-0 text-[2.125rem] font-light tracking-[-0.03em]">
                  Instagram <b className="font-extrabold">audience</b>
                </h2>
                <span className="text-sm text-gc-muted-soft">Last 30 days</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5 rounded-gc-lg bg-gc-surface p-5.5">
                  <span className="text-sm text-gc-muted">Followers</span>
                  <span className="text-5xl font-extrabold leading-none tracking-[-0.045em]">
                    {audience.followersLabel}
                  </span>
                </div>
                {audience.reachLabel && (
                  <div className="flex flex-col gap-1.5 rounded-gc-lg bg-gc-ink p-5.5 text-white">
                    <span className="text-sm opacity-75">Reach · 30 days</span>
                    <span className="text-5xl font-extrabold leading-none tracking-[-0.045em]">
                      {audience.reachLabel}
                    </span>
                  </div>
                )}
                {audience.profileViewsLabel && (
                  <div className="flex flex-col gap-1.5 rounded-gc-lg bg-[linear-gradient(140deg,#FFE3EA,#EDE4FD)] p-5.5">
                    <span className="text-sm text-gc-muted">
                      Profile views · 30 days
                    </span>
                    <span className="text-5xl font-extrabold leading-none tracking-[-0.045em]">
                      {audience.profileViewsLabel}
                    </span>
                  </div>
                )}

                {audience.ages.length > 0 && (
                  <div className="flex flex-col gap-3.5 rounded-gc-lg bg-gc-surface p-5.5 sm:col-span-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[17px] font-bold">Age</span>
                      {audience.topAge && (
                        <span className="text-sm text-gc-muted">
                          Largest · {audience.topAge.key} (
                          {audience.topAge.share}%)
                        </span>
                      )}
                    </div>
                    <div className="flex h-42 items-end gap-2.5">
                      {audience.ages.map((bucket) => {
                        const peak = audience.topAge?.share || 1;
                        return (
                          <div
                            key={bucket.key}
                            className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                          >
                            <span
                              className={cn(
                                "text-[13px]",
                                bucket.key === audience.topAge?.key
                                  ? "font-extrabold"
                                  : "font-medium",
                              )}
                            >
                              {bucket.share}%
                            </span>
                            <div
                              className={cn(
                                "min-h-1 w-full rounded-xl transition-[height] duration-700",
                                bucket.key === audience.topAge?.key
                                  ? "bg-gc-brand"
                                  : "bg-gc-brand-muted",
                              )}
                              style={{
                                height: `${Math.max(
                                  (bucket.share / peak) * 82,
                                  4,
                                )}%`,
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2.5">
                      {audience.ages.map((bucket) => (
                        <span
                          key={bucket.key}
                          className="flex-1 text-center text-xs text-gc-muted-soft"
                        >
                          {bucket.key}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {audience.gender.length > 0 && (
                  <div className="flex flex-col gap-4 rounded-gc-lg bg-gc-surface p-5.5">
                    <span className="text-[17px] font-bold">Gender</span>
                    <div className="flex h-4 gap-[3px] overflow-hidden rounded-lg">
                      {audience.gender.map((bucket, index) => (
                        <div
                          key={bucket.key}
                          className={cn(
                            "rounded-lg transition-[width] duration-700",
                            index === 0
                              ? "bg-gc-brand"
                              : index === 1
                                ? "bg-gc-ink"
                                : "bg-gc-brand-muted",
                          )}
                          style={{ width: `${bucket.share}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex flex-col gap-3">
                      {audience.gender.map((bucket, index) => (
                        <span
                          key={bucket.key}
                          className="flex items-center gap-2.5 text-base"
                        >
                          <span
                            className={cn(
                              "size-2.75 shrink-0 rounded-full",
                              index === 0
                                ? "bg-gc-brand"
                                : index === 1
                                  ? "bg-gc-ink"
                                  : "bg-gc-brand-muted",
                            )}
                          />
                          <span className="flex-1">{bucket.key}</span>
                          <b>{bucket.share}%</b>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))]">
                {[
                  { title: "Top cities", rows: audience.cities },
                  { title: "Top countries", rows: audience.countries },
                ]
                  .filter((group) => group.rows.length > 0)
                  .map((group) => (
                    <div
                      key={group.title}
                      className="rounded-gc-lg bg-gc-surface px-5.5 pb-2.5 pt-4.5"
                    >
                      <div className="mb-1.5 text-[17px] font-bold">
                        {group.title}
                      </div>
                      {group.rows.slice(0, 5).map((row, index) => (
                        <div
                          key={row.key}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <span
                            className={cn(
                              "flex size-9.5 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                              index === 0
                                ? "bg-gc-brand text-white"
                                : "bg-white text-gc-ink",
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-base font-medium">
                            {row.key}
                          </span>
                          <b className="text-base">{row.share}%</b>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* -------------------------------------------------------- reviews */}
          {reviews && (
            <section>
              <div className="mb-4.5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="m-0 text-[2.125rem] font-light tracking-[-0.03em]">
                  What brands <b className="font-extrabold">say</b>
                </h2>
                <span className="flex items-center gap-1.5 text-[15px] text-gc-muted-soft">
                  <Star className="size-4 fill-gc-brand text-gc-brand" />
                  <b className="text-gc-ink">{reviews.average.toFixed(1)}</b>
                  Based on {reviews.count} verified{" "}
                  {reviews.count === 1 ? "order" : "orders"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.items.map((review) => (
                  <div
                    key={review.id}
                    className="flex flex-col gap-3 rounded-gc-lg bg-gc-surface p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-gc-ink text-sm font-bold text-white">
                        {review.authorInitial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15px] font-bold">
                          {review.authorLabel}
                        </div>
                        {review.packageLabel && (
                          <div className="truncate text-[13px] text-gc-muted">
                            {review.packageLabel}
                          </div>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-sm font-bold">
                        <Star className="size-3.5 fill-gc-brand text-gc-brand" />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="m-0 text-pretty text-[15px] leading-relaxed text-gc-ink-muted">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* ------------------------------------------------------------ book */}
        {selectedPackage && (
          <>
            {/* Mobile scrim for the booking sheet. */}
            <div
              aria-hidden
              onClick={() => setSheetOpen(false)}
              className={cn(
                "fixed inset-0 z-50 bg-gc-ink/35 backdrop-blur-sm transition-opacity lg:hidden",
                sheetOpen
                  ? "opacity-100"
                  : "pointer-events-none opacity-0",
              )}
            />

            <aside
              id="pricing"
              data-open={sheetOpen}
              className={cn(
                // Mobile: bottom sheet. Desktop: sticky aside.
                "fixed inset-x-0 bottom-0 z-51 max-h-[90vh] translate-y-full overflow-auto rounded-t-gc-2xl border border-gc-line-soft bg-white shadow-[0_20px_60px_rgba(22,22,26,0.10)] transition-transform duration-500 data-[open=true]:translate-y-0",
                "lg:static lg:z-auto lg:max-h-none lg:translate-y-0 lg:basis-95 lg:rounded-gc-2xl lg:border-[1.5px]",
                "lg:sticky lg:top-24 lg:mx-auto lg:min-w-80 lg:max-w-95 lg:flex-[0_1_380px] lg:overflow-visible",
              )}
            >
              <div className="flex flex-col gap-3.5 bg-[linear-gradient(160deg,#FFF0F3,#FFDCE4)] px-5.5 pb-4.5 pt-5.5">
                <div className="flex items-center gap-2.5">
                  {model.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                    <img
                      src={model.avatarUrl}
                      alt=""
                      className="size-10.5 rounded-full border-2 border-white object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="flex size-10.5 items-center justify-center rounded-full border-2 border-white bg-white/70 text-sm font-bold">
                      {model.initials}
                    </span>
                  )}
                  <div>
                    <div className="text-[15px] font-bold">
                      {model.headline}
                    </div>
                    <div className="text-[13px] text-gc-muted">
                      {selectedPackage.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] text-gc-muted">From</span>
                  <span className="text-[2.75rem] font-extrabold leading-none tracking-[-0.045em]">
                    {selectedPackage.priceLabel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {termChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-white/85 px-2.75 py-1.5 text-[13px] font-semibold"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4.5 px-5.5 pb-5.5 pt-5">
                {model.packages.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {model.packages.map((pack) => (
                      <button
                        key={pack.id ?? pack.name}
                        type="button"
                        disabled={!pack.id}
                        onClick={() => pack.id && model.selectPackage(pack.id)}
                        className={cn(
                          "rounded-full px-3.5 py-2 text-[13px] font-semibold transition",
                          pack.id === selectedPackage.id
                            ? "bg-gc-ink text-white"
                            : "bg-gc-surface text-gc-ink hover:bg-gc-surface-alt",
                        )}
                      >
                        {pack.name}
                      </button>
                    ))}
                  </div>
                )}

                {selectedPackage.deliverables.length > 0 && (
                  <div className="flex flex-col gap-2.5">
                    <div className="text-sm font-bold text-gc-muted-soft">
                      What you get
                    </div>
                    {selectedPackage.deliverables.map((item) => (
                      <span
                        key={item}
                        className="flex items-center gap-2.5 text-base"
                      >
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gc-brand-soft text-gc-brand">
                          <Check className="size-3" strokeWidth={3.5} />
                        </span>
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {model.addOns.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-bold text-gc-muted-soft">
                      Add-ons{" "}
                      <span className="font-normal">· optional</span>
                    </div>
                    {model.addOns.map((addOn) => (
                      <button
                        key={addOn.id}
                        type="button"
                        aria-pressed={addOn.selected}
                        onClick={() => model.toggleAddOn(addOn.id)}
                        className={cn(
                          "flex min-h-13 items-center gap-3 rounded-full px-4 text-left transition",
                          addOn.selected
                            ? "bg-gc-ink text-white"
                            : "bg-gc-surface text-gc-ink hover:bg-gc-surface-alt",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                            addOn.selected
                              ? "border-gc-brand-muted bg-gc-brand-muted text-gc-ink"
                              : "border-[#cfcbd2]",
                          )}
                        >
                          {addOn.selected && (
                            <Check className="size-3" strokeWidth={3.5} />
                          )}
                        </span>
                        <span className="flex-1 text-[15px] font-medium">
                          {addOn.name}
                        </span>
                        <span className="text-[15px] font-bold">
                          +{addOn.priceLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-base text-gc-ink-muted">Total</span>
                  <span className="text-[1.75rem] font-extrabold tracking-[-0.03em]">
                    {model.totalLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={model.book}
                  className="flex h-14.5 items-center justify-between rounded-full bg-gc-ink py-0 pl-6 pr-2 text-[17px] font-bold text-white transition hover:bg-gc-ink-soft"
                >
                  {model.isBuyer ? "Continue" : "Book"} · {model.totalLabel}
                  <span className="flex size-11 items-center justify-center rounded-full bg-gc-brand">
                    <ArrowRight className="size-[18px]" />
                  </span>
                </button>

                <p className="m-0 text-center text-xs leading-relaxed text-gc-muted-soft">
                  Secure checkout on GoCollab · payment held until you approve
                  the delivery
                </p>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Mobile booking bar — hidden once the sheet is open. */}
      {selectedPackage && (
        <div
          className={cn(
            "fixed inset-x-3 bottom-[calc(0.875rem+env(safe-area-inset-bottom))] z-30 flex items-center gap-2 transition-opacity lg:hidden",
            sheetOpen || viewerIndex !== null
              ? "pointer-events-none opacity-0"
              : "opacity-100",
          )}
        >
          <div className="flex h-16 flex-1 items-center gap-2.5 rounded-full bg-gc-ink px-2.5 text-white shadow-[0_14px_30px_rgba(22,22,26,0.3)]">
            <div className="flex min-w-0 flex-1 flex-col pl-2">
              <span className="text-base font-bold">
                {selectedPackage.priceLabel}
              </span>
              <span className="truncate text-xs text-white/70">
                {selectedPackage.name} · {selectedPackage.deliveryLabel}{" "}
                delivery
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="h-12 shrink-0 rounded-full bg-white px-5 text-[15px] font-bold text-gc-ink"
            >
              Book now
            </button>
          </div>
        </div>
      )}

      <footer className="mx-auto max-w-[1280px] px-5 pb-10 pt-6 text-[13px] leading-relaxed text-gc-muted-soft sm:px-6">
        <p className="m-0">
          © {new Date().getFullYear()} GoCollab · This public profile is shared
          by the creator. Bookings &amp; payments are handled securely on
          GoCollab.
        </p>
      </footer>

      <MediaViewer
        media={model.media}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onBook={() => {
          setViewerIndex(null);
          openBooking();
        }}
        bookLabel={`Book · ${priceLabel}`}
      />
    </div>
  );
}
