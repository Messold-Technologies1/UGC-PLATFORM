"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MediaViewer } from "../shared/media-viewer";
import { AgeBars, GenderSplit, PlaceTabs } from "../shared/audience-parts";
import { BookingPanelBody } from "../shared/booking-panel-body";
import { PortfolioGrid } from "../shared/portfolio-grid";
import { ReviewsSection } from "../shared/reviews-section";
import {
  CATEGORY_TINTS,
  HeroVisual,
  VerifiedTick,
} from "../shared/template-chrome";
import type { PublicProfileViewModel } from "../types";

type TemplateProps = { model: PublicProfileViewModel };

/**
 * v4 "Panels" — everything lives in soft white cards on a grey field, with a
 * pill-shaped sticky header and a booking card pinned alongside.
 */
export function V4Template({ model }: TemplateProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  const { audience, reviews, selectedPackage } = model;
  const bioIsLong = (model.bio?.length ?? 0) > 220;
  const priceLabel = selectedPackage?.priceLabel ?? "—";

  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const navItems = [
    { id: "profile", label: "Profile" },
    ...(model.portfolio.length > 0
      ? [{ id: "work", label: "Work" }]
      : []),
    { id: "details", label: "Details" },
    ...(audience ? [{ id: "audience", label: "Audience" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#EDEDED] font-figtree text-[#141414] antialiased">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-2.5 px-4 pb-10 pt-2.5">
        <header className="sticky top-2.5 z-40 flex items-center justify-between gap-4 rounded-full bg-white/96 py-2 pl-5.5 pr-2 shadow-[0_4px_18px_rgba(0,0,0,0.05)] backdrop-blur-lg">
          <nav className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className="flex h-11 shrink-0 items-center rounded-full bg-gc-surface px-4 text-[17px] font-semibold text-[#141414] transition hover:bg-[#e8e8e8]"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => scrollTo("book")}
            className="h-11 shrink-0 whitespace-nowrap rounded-full bg-[#141414] px-5 text-[15px] font-bold text-white"
          >
            Book · {priceLabel}
          </button>
        </header>

        <div className="flex flex-wrap items-start gap-2.5">
          <main className="flex min-w-0 flex-1 basis-160 flex-col gap-2.5">
            {/* ------------------------------------------------------ profile */}
            <section
              id="profile"
              className="flex scroll-mt-20 flex-col gap-7 rounded-gc-xl bg-white p-5"
            >
              <div className="flex flex-wrap items-start gap-5">
                {model.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                  <img
                    src={model.avatarUrl}
                    alt=""
                    className="size-45 shrink-0 rounded-[22px] object-cover"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <span className="flex size-45 shrink-0 items-center justify-center rounded-[22px] bg-gc-surface text-4xl font-bold text-gc-muted">
                    {model.initials}
                  </span>
                )}
                <div className="flex min-w-0 flex-1 basis-65 flex-col gap-3 self-stretch">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex gap-2.5">
                      {model.languages.slice(0, 3).map((language, index) => (
                        <span
                          key={language}
                          className={cn(
                            "text-[17px] font-semibold",
                            index === 0
                              ? "text-[#141414] underline underline-offset-4"
                              : "text-gc-muted-faint",
                          )}
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                    {model.locationLabel && (
                      <span className="text-base text-gc-muted-faint">
                        {model.locationLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-col gap-1.5">
                    <h1 className="m-0 flex flex-wrap items-center gap-2.5 text-[clamp(2.125rem,4vw,3rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
                      {model.headline}
                      {model.verified && <VerifiedTick />}
                    </h1>
                    <span className="text-base text-gc-muted-faint">
                      {[
                        model.creatorTypeLabel,
                        audience &&
                          `${audience.followersLabel} followers on Instagram`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
              </div>

              {model.bio && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-[#9a9a9a]">Bio</span>
                  <p
                    className={cn(
                      "m-0 max-w-230 text-pretty text-[clamp(1.375rem,2.4vw,1.875rem)] leading-[1.3] tracking-[-0.02em]",
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
              <section className="flex items-center gap-9 overflow-x-auto rounded-gc-xl bg-white px-6 py-5.5">
                <span className="whitespace-nowrap text-sm font-bold text-[#9a9a9a]">
                  Content category
                </span>
                {model.categories.map((category, index) => (
                  <span
                    key={category}
                    className="flex items-center gap-2.5 whitespace-nowrap text-[26px] font-extrabold tracking-[-0.03em]"
                  >
                    <span
                      className={cn(
                        "size-8.5 rounded-full",
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

            {/* --------------------------------------------------------- work */}
            {(model.avatarUrl || model.portfolio.length > 0) && (
              <section
                id="work"
                className="grid scroll-mt-20 gap-2.5 rounded-gc-xl bg-white p-2.5 lg:grid-cols-2"
              >
                <div
                  className={cn(
                    "flex gap-4.5 rounded-gc-lg bg-[#F2F2F2] p-3.5",
                    model.intro && "transition hover:bg-[#eaeaea]",
                  )}
                >
                  <HeroVisual
                    media={model.intro}
                    fallbackImageUrl={model.avatarUrl}
                    fallbackInitials={model.initials}
                    onOpen={() => setViewerIndex(0)}
                    className="aspect-[9/16] w-42.5 shrink-0 rounded-gc-sm bg-[#ddd]"
                    playClassName="size-12"
                    playIconClassName="size-4 fill-[#141414] text-[#141414]"
                  />
                  <div className="flex min-w-0 flex-col gap-2.5 pt-1">
                    {model.intro ? (
                      <>
                        <span className="text-[19px] font-bold">
                          Intro reel
                        </span>
                        <span className="text-base leading-snug text-gc-muted-faint">
                          Watch this creator introduce their work
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewerIndex(0)}
                          className="mt-auto flex h-9.5 items-center self-start rounded-full bg-[#141414] px-4 text-sm font-semibold text-white"
                        >
                          Play intro
                        </button>
                      </>
                    ) : (
                      // No intro reel: the slot keeps the creator's portrait,
                      // so the playback copy and CTA are replaced rather than
                      // left pointing at nothing.
                      <>
                        <span className="text-[19px] font-bold">
                          {model.headline}
                        </span>
                        {model.locationLabel && (
                          <span className="text-base leading-snug text-gc-muted-faint">
                            {model.locationLabel}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {model.portfolio.length > 0 && (
                  <div className="flex flex-col gap-3 rounded-gc-lg bg-[#F2F2F2] p-3.5">
                    <div className="flex items-baseline justify-between px-0.5 pt-0.5">
                      <span className="text-[19px] font-bold">Portfolio</span>
                      <span className="text-[15px] text-gc-muted-faint">
                        {model.portfolioCountLabel}
                      </span>
                    </div>
                    <PortfolioGrid
                      items={model.portfolio}
                      allMedia={model.media}
                      onOpen={setViewerIndex}
                      className="flex-1 grid-cols-3 gap-2 sm:grid-cols-3"
                      tileClassName="rounded-gc-sm"
                    />
                  </div>
                )}
              </section>
            )}

            {/* ------------------------------------------------------ details */}
            <section
              id="details"
              className="flex scroll-mt-20 flex-col gap-2.5 rounded-gc-xl bg-white p-2.5"
            >
              <div className="px-3 pb-0.5 pt-3 text-2xl font-extrabold tracking-[-0.025em]">
                Details
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  ...model.facts.map((fact) => ({
                    key: fact.key as string,
                    label: fact.label,
                    values: fact.values,
                    icon: fact.icon,
                    available: fact.available,
                  })),
                  ...(model.openTo.length > 0
                    ? [
                        {
                          key: "OPEN_TO",
                          label: "Open to",
                          values: model.openTo,
                          icon: model.facts[0]?.icon,
                          available: undefined,
                        },
                      ]
                    : []),
                ].map((row) => {
                  const Icon = row.icon;
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        "flex flex-col gap-3 rounded-gc-lg bg-[#F2F2F2] p-4",
                        row.values.length > 1 && "sm:col-span-2",
                      )}
                    >
                      <div className="flex min-h-8 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white">
                          {Icon && <Icon className="size-[18px]" />}
                        </span>
                        <span className="flex-1 text-base text-[#555]">
                          {row.label}
                        </span>
                        {row.values.length === 1 && (
                          <span className="text-right text-[17px] font-bold">
                            {row.values[0]}
                          </span>
                        )}
                      </div>
                      {row.values.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 pl-12">
                          {row.values.map((value) => (
                            <span
                              key={value}
                              className="flex h-9 items-center rounded-full bg-white px-3.5 text-[15px] font-semibold"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ----------------------------------------------------- audience */}
            {audience && (
              <section
                id="audience"
                className="flex scroll-mt-20 flex-col gap-5.5 rounded-gc-xl bg-white px-2.5 pb-2.5 pt-7"
              >
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span className="text-sm font-bold text-[#9a9a9a]">
                    Instagram audience · last 30 days
                  </span>
                  <span className="text-[4rem] font-extrabold leading-none tracking-[-0.05em]">
                    {audience.followersLabel}
                  </span>
                  <span className="text-base text-[#555]">
                    followers
                    {audience.reachLabel && (
                      <>
                        {" · "}
                        <b>{audience.reachLabel}</b> reach
                      </>
                    )}
                    {audience.profileViewsLabel && (
                      <>
                        {" · "}
                        <b>{audience.profileViewsLabel}</b> profile views
                      </>
                    )}
                  </span>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
                  {audience.ages.length > 0 && (
                    <div className="flex flex-col gap-3 rounded-gc-lg bg-[#F2F2F2] p-4.5">
                      <span className="text-[17px] font-bold">Age</span>
                      <AgeBars
                        buckets={audience.ages}
                        topKey={audience.topAge?.key}
                        trackClassName="bg-white"
                        barClassName="bg-[#bdbdbd]"
                        topBarClassName="bg-gc-brand"
                      />
                    </div>
                  )}
                  {audience.gender.length > 0 && (
                    <div className="flex flex-col gap-2 rounded-gc-lg bg-[#F2F2F2] p-4.5">
                      <span className="mb-1 text-[17px] font-bold">Gender</span>
                      <GenderSplit
                        buckets={audience.gender}
                        trackClassName="bg-white"
                      />
                    </div>
                  )}
                  <div className="flex flex-col rounded-gc-lg bg-[#F2F2F2] p-4.5">
                    <PlaceTabs
                      cities={audience.cities}
                      countries={audience.countries}
                      trackClassName="bg-white"
                    />
                  </div>
                </div>
              </section>
            )}

            {reviews && (
              <ReviewsSection
                reviews={reviews}
                className="rounded-gc-xl bg-white p-5"
                cardClassName="rounded-gc-lg bg-[#F2F2F2]"
                heading={
                  <h2 className="m-0 text-2xl font-extrabold tracking-[-0.025em]">
                    What brands say
                  </h2>
                }
              />
            )}
          </main>

          {/* --------------------------------------------------------- book */}
          {selectedPackage && (
            <aside
              id="book"
              className="w-full scroll-mt-20 rounded-gc-xl bg-white p-2.5 lg:sticky lg:top-21 lg:mx-auto lg:max-w-97.5 lg:flex-[0_1_390px]"
            >
              <div className="flex flex-col gap-2.5 px-3 pb-1 pt-3.5">
                <div className="flex items-center gap-2.5">
                  {model.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                    <img
                      src={model.avatarUrl}
                      alt=""
                      className="size-10 rounded-xl object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <span className="flex size-10 items-center justify-center rounded-xl bg-gc-surface text-sm font-bold">
                      {model.initials}
                    </span>
                  )}
                  <div>
                    <div className="text-[15px] font-bold">
                      {model.headline}
                    </div>
                    <div className="text-[13px] text-gc-muted-faint">
                      {selectedPackage.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-gc-muted-faint">From</span>
                  <span className="text-[2.875rem] font-extrabold leading-none tracking-[-0.05em]">
                    {selectedPackage.priceLabel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    `${selectedPackage.deliveryLabel} delivery`,
                    `${selectedPackage.lengthLabel} video`,
                    `${selectedPackage.revisionsLabel} revisions`,
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="flex h-7.5 items-center rounded-full bg-[#F2F2F2] px-3 text-[13px] font-semibold"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <BookingPanelBody
                model={model}
                addOnStyle="box"
                className="px-3 pb-3 pt-3"
                ctaClassName="h-14.5"
              />
            </aside>
          )}
        </div>

        <footer className="flex flex-wrap items-end justify-between gap-3 rounded-gc-xl bg-white px-6 pb-5.5 pt-16 text-[15px] text-[#9a9a9a]">
          <span className="flex flex-col gap-1">
            <span>© {new Date().getFullYear()} GoCollab</span>
            <span>
              This public profile is shared by the creator. Bookings &amp;
              payments are handled securely on GoCollab.
            </span>
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
          scrollTo("book");
        }}
        bookLabel={`Book · ${priceLabel}`}
      />
    </div>
  );
}
