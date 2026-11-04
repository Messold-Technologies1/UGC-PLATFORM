"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { MediaViewer } from "../shared/media-viewer";
import { AudienceOutlined } from "../shared/audience-outlined";
import { BookingPanelBody } from "../shared/booking-panel-body";
import { FactTiles } from "../shared/fact-tiles";
import { PortfolioGrid } from "../shared/portfolio-grid";
import { ReviewsSection } from "../shared/reviews-section";
import {
  CATEGORY_TINTS,
  IntroReelCard,
  PublicPageFooter,
  PublicPageHeader,
  VerifiedTick,
} from "../shared/template-chrome";
import type { PublicProfileViewModel } from "../types";

type TemplateProps = { model: PublicProfileViewModel };

/**
 * v2 "Showcase" — reel-first hero with the About facts promoted into it as
 * tinted tiles, then portfolio, audience and a sticky pricing panel.
 */
export function V2Template({ model }: TemplateProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  const { audience, reviews, selectedPackage } = model;
  const bioIsLong = (model.bio?.length ?? 0) > 220;
  const priceLabel = selectedPackage?.priceLabel ?? "—";

  const scrollToPricing = () =>
    document
      .getElementById("pricing")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-white font-figtree text-gc-ink antialiased">
      <PublicPageHeader priceLabel={priceLabel} onBook={scrollToPricing} />

      <section className="bg-[linear-gradient(180deg,#FFF1F3_0%,#FFFFFF_100%)]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-9 px-5 pb-11 pt-9">
          {model.intro && (
            <IntroReelCard
              media={model.intro}
              onOpen={() => setViewerIndex(0)}
              className="mx-auto w-[min(320px,100%)] shrink-0"
            />
          )}

          <div className="flex min-w-0 flex-1 basis-120 flex-col gap-4.5">
            <div className="flex items-center gap-4">
              {model.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- remote S3 avatar
                <img
                  src={model.avatarUrl}
                  alt=""
                  className="size-18 rounded-full border-[3px] border-white object-cover shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <span className="flex size-18 items-center justify-center rounded-full border-[3px] border-white bg-gc-surface text-xl font-bold text-gc-muted">
                  {model.initials}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1.5">
                <h1 className="m-0 flex flex-wrap items-center gap-2.5 text-[clamp(1.875rem,4vw,2.625rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                  {model.headline}
                  {model.verified && <VerifiedTick />}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-gc-ink-muted">
                  {model.locationLabel && <span>{model.locationLabel}</span>}
                  {model.locationLabel && model.creatorTypeLabel && (
                    <span className="text-[#c9c5cc]">·</span>
                  )}
                  {model.creatorTypeLabel && (
                    <span>{model.creatorTypeLabel}</span>
                  )}
                </div>
              </div>
            </div>

            {model.categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {model.categories.map((category, index) => (
                  <span
                    key={category}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-sm font-semibold",
                      CATEGORY_TINTS[index % CATEGORY_TINTS.length],
                    )}
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}

            {model.bio && (
              <div className="flex max-w-160 flex-col gap-1.5">
                <p
                  className={cn(
                    "m-0 text-pretty text-[17px] leading-relaxed text-gc-ink-soft",
                    bioIsLong && !bioOpen && "line-clamp-4",
                  )}
                >
                  {model.bio}
                </p>
                {bioIsLong && (
                  <button
                    type="button"
                    onClick={() => setBioOpen((open) => !open)}
                    className="self-start text-[15px] font-semibold text-gc-brand"
                  >
                    {bioOpen ? "Show less" : "Read more"}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={scrollToPricing}
                className="h-13.5 rounded-full bg-gc-brand px-7 text-[17px] font-bold text-white shadow-[0_8px_20px_rgba(232,56,79,0.25)] transition hover:bg-gc-brand-hover"
              >
                Book now · from {priceLabel}
              </button>
              {selectedPackage && (
                <span className="text-sm text-gc-muted-soft">
                  ✓ {selectedPackage.deliveryLabel} delivery · ✓ Pay securely on
                  GoCollab
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-col gap-3">
              <h2 className="m-0 text-xl font-extrabold tracking-[-0.02em]">
                About this creator
              </h2>
              <FactTiles facts={model.facts} openTo={model.openTo} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-14 px-5 pb-20 pt-4 lg:flex-row lg:items-start lg:gap-10">
        <main className="contents lg:flex lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-14">
          {model.portfolio.length > 0 && (
            <section className="order-1 flex flex-col gap-4.5 lg:order-none">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="m-0 text-[1.625rem] font-extrabold tracking-[-0.02em]">
                  Portfolio
                </h2>
                <span className="text-[15px] text-gc-muted-soft">
                  {model.portfolioCountLabel}
                </span>
              </div>
              <PortfolioGrid
                items={model.portfolio}
                allMedia={model.media}
                onOpen={setViewerIndex}
              />
            </section>
          )}

          {audience && (
            <section
              id="audience"
              className="order-3 flex scroll-mt-20 flex-col gap-4.5 lg:order-none"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="m-0 text-[1.625rem] font-extrabold tracking-[-0.02em]">
                  Instagram audience
                </h2>
                <span className="text-sm text-gc-muted-soft">Last 30 days</span>
              </div>
              <AudienceOutlined audience={audience} />
            </section>
          )}

          {reviews && (
            <ReviewsSection
              reviews={reviews}
              className="order-4 lg:order-none"
              cardClassName="rounded-gc-md border border-gc-line bg-white"
              heading={
                <h2 className="m-0 text-[1.625rem] font-extrabold tracking-[-0.02em]">
                  What brands say
                </h2>
              }
            />
          )}
        </main>

        {selectedPackage && (
          <aside
            id="pricing"
            className="order-2 w-full scroll-mt-20 lg:order-none lg:sticky lg:top-21 lg:mx-auto lg:max-w-105 lg:flex-[1_1_340px]"
          >
            <div className="overflow-hidden rounded-gc-md border-[1.5px] border-gc-line bg-white shadow-[0_12px_40px_rgba(22,22,26,0.08)]">
              <div className="bg-[linear-gradient(180deg,#FFF5F6,#fff)] px-6 pb-4.5 pt-5.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[2.375rem] font-extrabold leading-none tracking-[-0.035em]">
                    {selectedPackage.priceLabel}
                  </span>
                  <span className="text-[15px] text-gc-muted-soft">
                    {selectedPackage.name}
                  </span>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {[
                    `${selectedPackage.deliveryLabel} delivery`,
                    `${selectedPackage.lengthLabel} video`,
                    `${selectedPackage.revisionsLabel} revisions`,
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-[#F4C9D0] bg-white px-2.5 py-1.5 text-[13px] font-semibold text-gc-tint-rose-ink"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <BookingPanelBody
                model={model}
                addOnStyle="box"
                className="border-t border-gc-line-soft px-6 py-4.5"
                checkClassName="bg-transparent text-gc-brand"
              />
            </div>
          </aside>
        )}
      </div>

      <PublicPageFooter className="max-w-[1200px]" />

      <MediaViewer
        media={model.media}
        index={viewerIndex}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
        onBook={() => {
          setViewerIndex(null);
          scrollToPricing();
        }}
        bookLabel={`Book · ${priceLabel}`}
      />
    </div>
  );
}
