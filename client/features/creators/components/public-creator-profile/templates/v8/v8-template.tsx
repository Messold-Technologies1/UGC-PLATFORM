"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MediaViewer } from "../shared/media-viewer";
import { AgeBars, GenderSplit, PlaceTabs } from "../shared/audience-parts";
import { BookingPanelBody } from "../shared/booking-panel-body";
import { PortfolioGrid } from "../shared/portfolio-grid";
import { ReviewsSection } from "../shared/reviews-section";
import { HeroVisual, VerifiedTick } from "../shared/template-chrome";
import type { PublicProfileViewModel } from "../types";

/** Stacked gradients: see the note in v5 on why these are not Tailwind classes. */
const PAGE_BACKGROUND =
  "radial-gradient(50% 40% at 100% 100%, #FFD9CC 0%, rgba(255,217,204,0) 70%)," +
  "radial-gradient(40% 35% at 0% 100%, #FBE0E8 0%, rgba(251,224,232,0) 70%)," +
  "#F4F4F3";

const COVER_BACKGROUND =
  "radial-gradient(50% 120% at 10% 0%, #FFD6DF 0%, rgba(255,214,223,0) 70%)," +
  "radial-gradient(45% 120% at 60% 100%, #EDE4FD 0%, rgba(237,228,253,0) 70%)," +
  "radial-gradient(40% 120% at 95% 20%, #FFE3D3 0%, rgba(255,227,211,0) 70%)," +
  "#F6F2F1";

const CATEGORY_DOTS = [
  "bg-gc-tint-rose text-gc-tint-rose-ink",
  "bg-gc-tint-mint text-gc-tint-mint-ink",
  "bg-gc-tint-violet text-gc-tint-violet-ink",
  "bg-gc-tint-sky text-gc-tint-sky-ink",
];

type TemplateProps = { model: PublicProfileViewModel };

/**
 * v8 "Profile" — a wide banner card over an About table and an outlined
 * audience panel, with the booking card pinned alongside.
 */
export function V8Template({ model }: TemplateProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  const { audience, reviews, selectedPackage } = model;
  const bioIsLong = (model.bio?.length ?? 0) > 220;
  const priceLabel = selectedPackage?.priceLabel ?? "—";

  const scrollToBook = () =>
    document
      .getElementById("book")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const headerStats = [
    audience && { label: "followers", value: audience.followersLabel },
    selectedPackage && {
      label: "delivery",
      value: selectedPackage.deliveryLabel,
    },
    selectedPackage && {
      label: `${selectedPackage.lengthLabel} video`,
      value: `${selectedPackage.revisionsLabel} revisions`,
    },
  ].filter((stat): stat is { label: string; value: string } => Boolean(stat));

  const audienceStats = audience
    ? [
        { label: "Followers", value: audience.followersLabel },
        { label: "Reach", value: audience.reachLabel },
        { label: "Profile views", value: audience.profileViewsLabel },
        audience.topAge && {
          label: "Largest age group",
          value: audience.topAge.key,
        },
      ].filter((stat): stat is { label: string; value: string } => Boolean(stat))
    : [];

  const aboutRows = [
    ...(model.bio ? [{ key: "BIO", label: "Bio", values: [model.bio] }] : []),
    ...model.facts.map((fact) => ({
      key: fact.key as string,
      label: fact.label,
      values: fact.values,
    })),
    ...(model.openTo.length > 0
      ? [{ key: "OPEN_TO", label: "Open to", values: model.openTo }]
      : []),
  ];

  return (
    <div className="min-h-screen font-figtree text-[#141414] antialiased"
      style={{ background: PAGE_BACKGROUND }}>
      <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 pt-4.5">
        <Link href="/" className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset */}
          <img
            src="/brand-logo.png"
            alt="GoCollab"
            className="h-8 w-auto object-contain object-left sm:h-9"
            loading="eager"
            decoding="async"
            draggable={false}
          />
        </Link>
        <Link
          href="/creators"
          className="flex h-10 items-center rounded-xl border border-[#E4E4E2] bg-white px-4 text-sm font-semibold"
        >
          Browse creators
        </Link>
      </header>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 pb-15 pt-4">
        {/* ----------------------------------------------------- banner card */}
        <section className="overflow-hidden rounded-gc-2xl bg-[#F1F1F0] shadow-[0_14px_40px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
          <div className="h-30" style={{ background: COVER_BACKGROUND }} />
          <div className="relative flex flex-wrap items-end gap-7 px-5 pb-6.5 sm:px-7">
            <div className="-mt-14 flex min-w-0 flex-1 basis-120 flex-col gap-5">
              <div className="relative w-28">
                {model.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                  <img
                    src={model.avatarUrl}
                    alt=""
                    className="size-28 rounded-full border-4 border-[#F1F1F0] bg-[#F1F1F0] object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <span className="flex size-28 items-center justify-center rounded-full border-4 border-[#F1F1F0] bg-white text-2xl font-bold text-gc-muted">
                    {model.initials}
                  </span>
                )}
                {model.verified && (
                  <VerifiedTick className="absolute bottom-1.5 right-1 size-6.5 border-[3px] border-[#F1F1F0] bg-[#3B82F6]" />
                )}
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-1">
                  <h1 className="m-0 text-[clamp(1.625rem,3vw,2.125rem)] font-semibold leading-tight tracking-[-0.025em]">
                    {model.headline}
                  </h1>
                  <span className="text-base text-gc-muted-faint">
                    {[model.creatorTypeLabel, model.locationLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
                {model.categories.length > 0 && (
                  <span className="flex h-10.5 items-center gap-2.5 rounded-full bg-[#E8E8E6] py-0 pl-2 pr-4 text-[15px] font-medium">
                    <span className="flex">
                      {model.categories.map((category, index) => (
                        <span
                          key={category}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full border-2 border-[#E8E8E6] text-[11px] font-extrabold",
                            CATEGORY_DOTS[index % CATEGORY_DOTS.length],
                            index > 0 && "-ml-2",
                          )}
                        >
                          {category[0]}
                        </span>
                      ))}
                    </span>
                    {model.categories.join(" · ")}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-5">
                {headerStats.length > 0 && (
                  <div className="flex flex-wrap items-center">
                    {headerStats.map((stat, index) => (
                      <div
                        key={stat.label}
                        className={cn(
                          "flex flex-col items-center gap-0.75 px-[clamp(1rem,3vw,2rem)]",
                          index > 0 && "border-l border-[#DCDCDA]",
                        )}
                      >
                        <span className="text-[22px] font-semibold tracking-[-0.02em]">
                          {stat.value}
                        </span>
                        <span className="text-sm text-gc-muted-faint">
                          {stat.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex max-w-85 flex-1 basis-65 flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={scrollToBook}
                    className="h-15 w-full rounded-full bg-[#0A0A0A] text-lg font-medium text-white transition hover:bg-[#262626]"
                  >
                    Book now · {priceLabel}
                  </button>
                  {selectedPackage && (
                    <span className="text-[13px] text-gc-muted-faint">
                      ✓ {selectedPackage.deliveryLabel} delivery · ✓ Secure
                      payment
                    </span>
                  )}
                </div>
              </div>
            </div>

            <HeroVisual
              media={model.intro}
              fallbackImageUrl={model.avatarUrl}
              fallbackInitials={model.initials}
              onOpen={() => setViewerIndex(0)}
              className="mx-auto aspect-[9/16] w-[min(220px,100%)] shrink-0 rounded-gc-md border-4 border-white bg-[#E6E6E4] shadow-[0_16px_40px_rgba(0,0,0,0.16)] lg:-mt-22.5"
              playClassName="size-13.5"
              playIconClassName="size-4 fill-[#141414] text-[#141414]"
              badge={
                <span className="absolute left-2.5 top-2.5 flex h-7 items-center rounded-full bg-white/90 px-2.5 text-xs font-semibold">
                  Intro
                </span>
              }
            />
          </div>
        </section>

        <div className="flex flex-wrap items-start gap-4">
          <main className="flex min-w-0 flex-1 basis-150 flex-col gap-4">
            {model.portfolio.length > 0 && (
              <section className="flex flex-col gap-4 rounded-gc-lg bg-white p-5.5 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
                <div className="flex items-baseline justify-between">
                  <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
                    Portfolio
                  </h2>
                  <span className="text-sm text-gc-muted-faint">
                    {model.portfolioCountLabel}
                  </span>
                </div>
                <PortfolioGrid
                  items={model.portfolio}
                  allMedia={model.media}
                  onOpen={setViewerIndex}
                  className="sm:grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))]"
                  tileClassName="rounded-gc-md"
                />
              </section>
            )}

            <section className="rounded-gc-lg bg-white px-5.5 pb-2 pt-5.5 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
              <h2 className="mb-1.5 mt-0 text-xl font-bold tracking-[-0.015em]">
                About this creator
              </h2>
              {aboutRows.map((row, index) => (
                <div
                  key={row.key}
                  className={cn(
                    "grid items-start gap-4 py-4 sm:grid-cols-[minmax(8.125rem,12.5rem)_minmax(0,1fr)]",
                    index > 0 && "border-t border-[#EFEFED]",
                  )}
                >
                  <span className="pt-2.25 text-[15px] font-semibold">
                    {row.label}
                  </span>
                  {row.key === "BIO" ? (
                    <div className="flex flex-col gap-1.5">
                      <div
                        className={cn(
                          "rounded-xl border border-[#E6E6E4] px-3.5 py-2.5 text-[15px] leading-relaxed text-[#333]",
                          bioIsLong && !bioOpen && "line-clamp-4",
                        )}
                      >
                        {row.values[0]}
                      </div>
                      {bioIsLong && (
                        <button
                          type="button"
                          onClick={() => setBioOpen((open) => !open)}
                          className="self-start text-sm font-semibold text-gc-brand"
                        >
                          {bioOpen ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex min-w-0 flex-wrap gap-2">
                      {row.values.map((value) => (
                        <span
                          key={value}
                          className="flex h-10.5 items-center rounded-xl border border-[#E6E6E4] px-3.5 text-[15px]"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>

            {audience && (
              <section
                id="audience"
                className="flex scroll-mt-5 flex-col gap-5 rounded-gc-lg bg-white p-5.5 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
                    Instagram audience
                  </h2>
                  <span className="text-[13px] text-gc-muted-faint">
                    Last 30 days
                  </span>
                </div>

                {audienceStats.length > 0 && (
                  <div className="flex flex-wrap border-b border-[#EFEFED] pb-5">
                    {audienceStats.map((stat, index) => (
                      <div
                        key={stat.label}
                        className={cn(
                          "flex flex-col gap-1 px-5.5",
                          index === 0 ? "pl-0" : "border-l border-[#EFEFED]",
                        )}
                      >
                        <span className="text-sm text-gc-muted-faint">
                          {stat.label}
                        </span>
                        <span className="text-xl font-semibold">
                          {stat.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid gap-6 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]">
                  {audience.ages.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <span className="text-[15px] font-semibold">Age</span>
                      <AgeBars
                        buckets={audience.ages}
                        topKey={audience.topAge?.key}
                        trackClassName="bg-[#F1F1F0]"
                        barClassName="bg-[#F6C9D2]"
                      />
                    </div>
                  )}
                  {audience.gender.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <span className="text-[15px] font-semibold">Gender</span>
                      <GenderSplit
                        buckets={audience.gender}
                        trackClassName="bg-[#F1F1F0]"
                        segmentClassNames={[
                          "bg-gc-brand",
                          "bg-[#141414]",
                          "bg-[#C8C8C6]",
                        ]}
                      />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <PlaceTabs
                      cities={audience.cities}
                      countries={audience.countries}
                      trackClassName="bg-[#F1F1F0]"
                      activeTabClassName="bg-white text-[#141414] shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                      idleTabClassName="text-gc-muted-faint"
                    />
                  </div>
                </div>
              </section>
            )}

            {reviews && (
              <ReviewsSection
                reviews={reviews}
                className="rounded-gc-lg bg-white p-5.5 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                cardClassName="rounded-gc-md border border-[#EFEFED] bg-white"
                heading={
                  <h2 className="m-0 text-xl font-bold tracking-[-0.015em]">
                    What brands say
                  </h2>
                }
              />
            )}
          </main>

          {selectedPackage && (
            <aside
              id="book"
              className="w-full scroll-mt-5 rounded-gc-lg bg-white p-4.5 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_14px_40px_rgba(0,0,0,0.06)] lg:sticky lg:top-4 lg:mx-auto lg:max-w-100 lg:flex-[1_1_320px]"
            >
              <div className="flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">Package</span>
                  <span className="flex h-6.5 items-center gap-1.25 rounded-lg border border-[#E6E6E4] px-2.5 text-xs font-semibold text-[#555]">
                    <span className="size-1.5 rounded-full bg-gc-success" />
                    {selectedPackage.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[2.625rem] font-bold leading-none tracking-[-0.04em]">
                    {selectedPackage.priceLabel}
                  </span>
                  <span className="text-sm text-gc-muted-faint">
                    base price
                  </span>
                </div>
                <div className="flex border-y border-[#EFEFED] py-3">
                  {[
                    { label: "Delivery", value: selectedPackage.deliveryLabel },
                    {
                      label: "Length",
                      value: `${selectedPackage.lengthLabel} video`,
                    },
                    {
                      label: "Revisions",
                      value: selectedPackage.revisionsLabel,
                    },
                  ].map((term, index) => (
                    <div
                      key={term.label}
                      className={cn(
                        "flex flex-1 flex-col gap-0.5 px-2.5",
                        index > 0 && "border-l border-[#EFEFED]",
                      )}
                    >
                      <span className="text-[13px] text-gc-muted-faint">
                        {term.label}
                      </span>
                      <span className="text-[15px] font-semibold">
                        {term.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <BookingPanelBody
                model={model}
                addOnStyle="box"
                className="pt-3.5"
                checkClassName="bg-transparent text-gc-brand"
              />
            </aside>
          )}
        </div>

        <footer className="flex flex-wrap justify-between gap-3 px-1 pt-6 text-[13px] text-gc-muted-faint">
          <span>
            © {new Date().getFullYear()} GoCollab · This public profile is
            shared by the creator. Bookings &amp; payments are handled securely
            on GoCollab.
          </span>
        </footer>
      </div>

      <MediaViewer
        media={model.media}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onBook={() => {
          setViewerIndex(null);
          scrollToBook();
        }}
        bookLabel={`Book · ${priceLabel}`}
      />
    </div>
  );
}
