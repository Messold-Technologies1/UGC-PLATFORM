"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaViewer } from "../shared/media-viewer";
import { AgeBars, GenderSplit, PlaceTabs } from "../shared/audience-parts";
import { PortfolioGrid } from "../shared/portfolio-grid";
import { ReviewsSection } from "../shared/reviews-section";
import {
  CATEGORY_TINTS,
  HeroVisual,
  VerifiedTick,
} from "../shared/template-chrome";
import type { PublicProfileViewModel } from "../types";

/** Film-grain overlay used on the booking panel, inlined to avoid a request. */
/**
 * Stacked radial gradients over a solid base. Kept as an inline style: a
 * Tailwind arbitrary value cannot express several comma-separated gradient
 * layers plus a fallback colour, and silently drops the whole declaration —
 * which left white text on a white panel.
 */
const BOOKING_BACKGROUND =
  "radial-gradient(45% 40% at 12% 10%, #F2889B 0%, rgba(242,136,155,0) 70%)," +
  "radial-gradient(60% 70% at 85% 55%, #B81830 0%, rgba(184,24,48,0) 70%)," +
  "radial-gradient(70% 60% at 40% 100%, #A3142A 0%, rgba(163,20,42,0) 70%)," +
  "#C9233D";

const GRAIN_URL = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`;

type TemplateProps = { model: PublicProfileViewModel };

/**
 * v5 "Spotlight" — a tall profile card pinned beside stacked content cards,
 * closing on a saturated booking panel.
 */
export function V5Template({ model }: TemplateProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  const { audience, reviews, selectedPackage } = model;
  const bioIsLong = (model.bio?.length ?? 0) > 220;
  const priceLabel = selectedPackage?.priceLabel ?? "—";

  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const stats = audience
    ? [
        { label: "Followers", value: audience.followersLabel },
        { label: "Reach", value: audience.reachLabel },
        { label: "Profile views", value: audience.profileViewsLabel },
      ].filter((stat): stat is { label: string; value: string } =>
        Boolean(stat.value),
      )
    : [];

  const navItems = [
    { id: "bio", label: "Bio" },
    ...(model.portfolio.length > 0 ? [{ id: "work", label: "Work" }] : []),
    { id: "details", label: "Details" },
    ...(audience ? [{ id: "audience", label: "Audience" }] : []),
    { id: "book", label: "Book" },
  ];

  return (
    <div className="min-h-screen bg-[#EBEBED] font-figtree text-gc-ink antialiased">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-3 px-4 pb-10 pt-3">
        {/* ---------------------------------------------------- profile card */}
        <aside className="mx-auto w-full shrink-0 lg:sticky lg:top-3 lg:max-w-102.5 lg:flex-[1_1_360px]">
          <div className="flex flex-col rounded-gc-2xl bg-white p-4 pb-4.5">
            <HeroVisual
              media={model.intro}
              fallbackImageUrl={model.avatarUrl}
              fallbackInitials={model.initials}
              onOpen={() => setViewerIndex(0)}
              className="aspect-square rounded-gc-md bg-[#E6E6E8] lg:aspect-[5/4]"
              imageClassName="object-[center_28%]"
              overlay={
                <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent to-40%" />
              }
              badge={
                <span className="absolute left-3 top-3 flex h-7.5 items-center rounded-full bg-white/90 px-3 text-[13px] font-semibold">
                  Intro reel
                </span>
              }
            />

            <div className="relative -mt-14.5 flex items-end justify-between px-1.5">
              {model.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                <img
                  src={model.avatarUrl}
                  alt=""
                  className="size-26 rounded-full border-[5px] border-white bg-white object-cover"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <span className="flex size-26 items-center justify-center rounded-full border-[5px] border-white bg-gc-surface text-2xl font-bold text-gc-muted">
                  {model.initials}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 px-1">
              <div className="flex min-w-0 flex-col gap-0.75">
                <h1 className="m-0 flex items-center gap-2 text-[26px] font-extrabold tracking-[-0.025em]">
                  {model.headline}
                  {model.verified && <VerifiedTick className="size-5" />}
                </h1>
                <span className="text-[15px] text-gc-muted-faint">
                  {[model.creatorTypeLabel, model.cityLabel]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollTo("book")}
                className="h-11 shrink-0 rounded-full bg-gc-ink px-5 text-[15px] font-semibold text-white"
              >
                Book
              </button>
            </div>

            {stats.length > 0 && (
              <>
                <div className="mx-1 my-4.5 h-px bg-[#E8E8E8]" />
                <div className="grid grid-cols-3 gap-2 px-1">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col items-center gap-1"
                    >
                      <span className="text-2xl font-medium tracking-[-0.03em]">
                        {stat.value}
                      </span>
                      <span className="text-sm text-gc-muted-faint">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => scrollTo("book")}
              className="-mx-1 mt-5 flex h-17.5 items-center gap-3 rounded-full bg-[linear-gradient(100deg,#0E0E0E_0%,#1C1C1C_62%,#5A5A5A_88%,#3A3A3A_100%)] px-2.5 text-lg font-medium text-white"
            >
              <span className="flex size-12.5 shrink-0 items-center justify-center rounded-full bg-white text-gc-ink">
                <ArrowRight className="size-5" />
              </span>
              <span className="flex-1 pr-13 text-center">
                Book now · {priceLabel}
              </span>
            </button>
          </div>
        </aside>

        {/* --------------------------------------------------------- content */}
        <main className="flex min-w-0 flex-1 basis-140 flex-col gap-3">
          <nav className="sticky top-3 z-40 flex gap-1 overflow-x-auto rounded-full bg-white/96 p-1.5 backdrop-blur-lg">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className="h-11 shrink-0 rounded-full bg-[#F2F2F3] px-4 text-[17px] font-medium text-gc-ink transition hover:bg-[#e8e8ea]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <section
            id="bio"
            className="flex scroll-mt-20 flex-col gap-10 rounded-gc-2xl bg-white p-5.5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex gap-2.5">
                {model.languages.slice(0, 3).map((language, index) => (
                  <span
                    key={language}
                    className={cn(
                      "text-[17px]",
                      index === 0
                        ? "text-gc-ink underline underline-offset-4"
                        : "text-gc-muted-faint",
                    )}
                  >
                    {language}
                  </span>
                ))}
              </div>
              {model.locationLabel && (
                <span className="text-base">{model.locationLabel}</span>
              )}
            </div>
            {model.bio && (
              <div className="flex flex-col gap-2">
                <p
                  className={cn(
                    "m-0 text-pretty text-[clamp(1.375rem,2.4vw,1.875rem)] leading-[1.3] tracking-[-0.015em]",
                    bioIsLong && !bioOpen && "line-clamp-4",
                  )}
                >
                  {model.bio}
                </p>
                {bioIsLong && (
                  <button
                    type="button"
                    onClick={() => setBioOpen((open) => !open)}
                    className="self-start text-base font-bold text-gc-brand"
                  >
                    {bioOpen ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}
          </section>

          {model.categories.length > 0 && (
            <section className="flex flex-wrap items-center gap-x-6 gap-y-3.5 rounded-gc-2xl bg-white px-5.5 py-5">
              {model.categories.map((category, index) => (
                <span
                  key={category}
                  className="flex items-center gap-2.25 whitespace-nowrap text-[26px] font-extrabold tracking-[-0.035em]"
                >
                  <span
                    className={cn(
                      "size-7.5 rounded-full",
                      CATEGORY_TINTS[index % CATEGORY_TINTS.length].split(
                        " ",
                      )[0],
                    )}
                  />
                  {category}
                </span>
              ))}
            </section>
          )}

          {model.portfolio.length > 0 && (
            <section
              id="work"
              className="scroll-mt-20 rounded-gc-2xl bg-white p-2"
            >
              <div className="flex flex-col gap-3.5 rounded-gc-lg bg-[#F2F2F3] p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-semibold">Portfolio</span>
                  <span className="text-[15px] text-gc-muted-faint">
                    {model.portfolioCountLabel}
                  </span>
                </div>
                <PortfolioGrid
                  items={model.portfolio}
                  allMedia={model.media}
                  onOpen={setViewerIndex}
                  className="grid-cols-3 gap-2 sm:grid-cols-3"
                />
              </div>
            </section>
          )}

          <section
            id="details"
            className="flex scroll-mt-20 flex-col gap-1.5 rounded-gc-2xl bg-[linear-gradient(180deg,#F7F7F9,#FFFFFF_40%)] p-4"
          >
            <div className="mb-1.5 flex items-center gap-3 border-b border-gc-line-soft px-1 pb-3.5">
              {model.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                <img
                  src={model.avatarUrl}
                  alt=""
                  className="size-11.5 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="flex size-11.5 items-center justify-center rounded-full bg-gc-surface text-sm font-bold">
                  {model.initials}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold">{model.headline}</div>
                <div className="mt-0.75 flex gap-1.5">
                  {model.creatorTypeLabel && (
                    <span className="flex h-6 items-center rounded-full border border-[#dadada] px-2.25 text-[13px] text-[#555]">
                      {model.creatorTypeLabel}
                    </span>
                  )}
                  {model.verified && (
                    <span className="flex h-6 items-center rounded-full bg-gc-brand-soft px-2.25 text-[13px] font-semibold text-[#7a1a2a]">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {[
              ...model.facts.map((fact) => ({
                key: fact.key as string,
                label: fact.label,
                values: fact.values,
                available: fact.available,
              })),
              ...(model.openTo.length > 0
                ? [
                    {
                      key: "OPEN_TO",
                      label: "Open to",
                      values: model.openTo,
                      available: undefined,
                    },
                  ]
                : []),
            ].map((row) => (
              <div
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-4 px-1 py-3"
              >
                <span className="shrink-0 text-base font-semibold">
                  {row.label}
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {row.values.map((value) => (
                    <span
                      key={value}
                      className={cn(
                        "flex h-8.5 items-center rounded-full px-3.25 text-[15px] font-semibold",
                        row.key === "ON_LOCATION" && row.available
                          ? "bg-gc-brand-soft text-gc-tint-rose-ink"
                          : row.key === "OPEN_TO"
                            ? "bg-gc-brand-soft text-gc-tint-rose-ink"
                            : "bg-[#EFEFF1] text-gc-ink",
                      )}
                    >
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {audience && (
            <section
              id="audience"
              className="flex scroll-mt-20 flex-col gap-2 rounded-gc-2xl bg-white p-2"
            >
              <div className="flex items-baseline justify-between px-3.5 pb-1.5 pt-4">
                <span className="text-[22px] font-bold tracking-[-0.02em]">
                  Instagram audience
                </span>
                <span className="text-sm text-gc-muted-faint">
                  Last 30 days
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                {audience.ages.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-gc-lg bg-[#F2F2F3] p-4.5">
                    <span className="text-base font-semibold">Age</span>
                    <AgeBars
                      buckets={audience.ages}
                      topKey={audience.topAge?.key}
                      trackClassName="bg-white"
                      barClassName="bg-[#C8C8CC]"
                    />
                  </div>
                )}
                {audience.gender.length > 0 && (
                  <div className="flex flex-col gap-3.5 rounded-gc-lg bg-[#F2F2F3] p-4.5">
                    <span className="text-base font-semibold">Gender</span>
                    <GenderSplit
                      buckets={audience.gender}
                      segmentClassNames={[
                        "bg-gc-brand",
                        "bg-gc-ink",
                        "bg-[#C8C8CC]",
                      ]}
                    />
                  </div>
                )}
              </div>
              <div className="rounded-gc-lg bg-[#F2F2F3] px-4.5 pb-2 pt-3">
                <PlaceTabs
                  cities={audience.cities}
                  countries={audience.countries}
                />
              </div>
            </section>
          )}

          {reviews && (
            <ReviewsSection
              reviews={reviews}
              className="rounded-gc-2xl bg-white p-5.5"
              cardClassName="rounded-gc-lg bg-[#F2F2F3]"
              heading={
                <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
                  What brands say
                </h2>
              }
            />
          )}

          {/* ------------------------------------------------------- booking */}
          {selectedPackage && (
            <section
              id="book"
              className="relative scroll-mt-20 overflow-hidden rounded-gc-2xl text-white"
              style={{ background: BOOKING_BACKGROUND }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-50 mix-blend-overlay"
                style={{ backgroundImage: GRAIN_URL }}
              />
              <div className="relative flex flex-col gap-4 p-4 pt-5.5">
                <div className="flex flex-wrap items-end justify-between gap-3 px-1.5">
                  <div>
                    <div className="text-[15px] font-semibold">
                      {selectedPackage.name} · from
                    </div>
                    <div className="text-[clamp(2.875rem,5vw,3.5rem)] font-extrabold leading-none tracking-[-0.05em]">
                      {selectedPackage.priceLabel}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      `${selectedPackage.deliveryLabel} delivery`,
                      `${selectedPackage.lengthLabel} video`,
                      `${selectedPackage.revisionsLabel} revisions`,
                    ].map((chip) => (
                      <span
                        key={chip}
                        className="flex h-8.5 items-center rounded-full border-[1.5px] border-white/85 px-3.25 text-sm font-semibold"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedPackage.deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-x-4.5 gap-y-2 px-1.5">
                    {selectedPackage.deliverables.map((item) => (
                      <span
                        key={item}
                        className="flex items-center gap-2 text-base font-semibold"
                      >
                        <span className="flex size-5 items-center justify-center rounded-full bg-white text-gc-brand">
                          <Check className="size-3" strokeWidth={3.5} />
                        </span>
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {model.addOns.length > 0 && (
                  <div className="overflow-hidden rounded-gc-md bg-white/95 text-gc-ink">
                    <div className="px-4 pb-1 pt-3 text-[13px] font-bold text-gc-muted-faint">
                      Add-ons · optional
                    </div>
                    {model.addOns.map((addOn, index) => (
                      <button
                        key={addOn.id}
                        type="button"
                        aria-pressed={addOn.selected}
                        onClick={() => model.toggleAddOn(addOn.id)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-left text-gc-ink",
                          index > 0 && "border-t border-[#eee]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                            addOn.selected
                              ? "border-gc-brand bg-gc-brand text-white"
                              : "border-[#cfcfcf]",
                          )}
                        >
                          {addOn.selected && (
                            <Check className="size-3" strokeWidth={3.5} />
                          )}
                        </span>
                        <span className="flex-1 text-base">{addOn.name}</span>
                        <span className="text-base font-bold">
                          +{addOn.priceLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={model.book}
                  className="flex h-17.5 items-center gap-3 rounded-full bg-white px-3 text-lg font-medium text-gc-ink"
                >
                  <span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-gc-ink text-white">
                    <ArrowRight className="size-5" />
                  </span>
                  <span className="flex-1 pr-13 text-center">
                    {model.isBuyer ? "Continue" : "Place order"} ·{" "}
                    {model.totalLabel}
                  </span>
                </button>

                <p className="m-0 text-center text-[13px] font-medium leading-relaxed">
                  Secure checkout on GoCollab · payment held until you approve
                  the delivery
                </p>
              </div>
            </section>
          )}

          <footer className="flex flex-col gap-0.75 rounded-gc-2xl bg-white px-5 pb-5 pt-14 text-[15px] text-[#9a9a9a]">
            <span>gocollab.io</span>
            <span>
              Bookings &amp; payments are handled securely on GoCollab.
            </span>
          </footer>
        </main>
      </div>

      <MediaViewer
        media={model.media}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onBook={() => {
          setViewerIndex(null);
          scrollTo("book");
        }}
        bookLabel={`Book · ${priceLabel}`}
      />
    </div>
  );
}
