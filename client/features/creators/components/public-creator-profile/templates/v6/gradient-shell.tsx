"use client";

import { useState, type ReactNode } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { MediaViewer } from "../shared/media-viewer";
import { BookingPanelBody } from "../shared/booking-panel-body";
import { FactTiles } from "../shared/fact-tiles";
import { PortfolioGrid } from "../shared/portfolio-grid";
import { ReviewsSection } from "../shared/reviews-section";
import { CATEGORY_TINTS, VerifiedTick } from "../shared/template-chrome";
import type { PublicProfileViewModel } from "../types";

/** Stacked gradients: see the note in v5 on why this is not a Tailwind class. */
const PAGE_BACKGROUND =
  "radial-gradient(40% 40% at 0% 0%, #FFE1E7 0%, rgba(255,225,231,0) 70%)," +
  "radial-gradient(35% 35% at 100% 0%, #EDE4FD 0%, rgba(237,228,253,0) 70%)," +
  "#fff";

type GradientShellProps = {
  model: PublicProfileViewModel;
  /** Audience treatment, which is the only structural difference v6 vs v7. */
  audienceSlot: ReactNode;
  /** v7 adds a reassurance line under the profile card CTA. */
  showTrustLine?: boolean;
};

/**
 * Shared implementation for v6 and v7.
 *
 * Both designs are the same page — tinted gradient field, pinned profile card,
 * tag row, portfolio, fact tiles, package card — and differ only in how the
 * Instagram audience is drawn, so that section is passed in.
 */
export function GradientShell({
  model,
  audienceSlot,
  showTrustLine = false,
}: GradientShellProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [bioOpen, setBioOpen] = useState(false);

  const { audience, reviews, selectedPackage } = model;
  const bioIsLong = (model.bio?.length ?? 0) > 170;
  const priceLabel = selectedPackage?.priceLabel ?? "—";

  const scrollToPackage = () =>
    document
      .getElementById("package")
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

  const packageImage =
    model.portfolio[1]?.thumbnailUrl ??
    model.portfolio[0]?.thumbnailUrl ??
    model.intro?.thumbnailUrl ??
    model.avatarUrl;

  return (
    <div className="min-h-screen font-figtree text-[#141414] antialiased"
      style={{ background: PAGE_BACKGROUND }}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start gap-8 px-5 pb-12 pt-5">
        {/* ---------------------------------------------------- profile card */}
        <section className="mx-auto w-full min-w-0 shrink-0 lg:sticky lg:top-5 lg:max-w-95 lg:flex-[0_1_380px]">
          <div className="flex flex-col gap-4 rounded-gc-2xl bg-white p-3 pb-4 shadow-[0_10px_40px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]">
            {model.intro ? (
              <button
                type="button"
                onClick={() => setViewerIndex(0)}
                className="relative aspect-square overflow-hidden rounded-gc-lg bg-[#eee] lg:aspect-[5/4]"
              >
                {model.intro.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote S3 thumbnail
                  <img
                    src={model.intro.thumbnailUrl}
                    alt=""
                    className="absolute inset-0 size-full object-cover object-[center_22%]"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <video
                    src={model.intro.videoUrl}
                    className="absolute inset-0 size-full object-cover object-[center_22%]"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
                <span className="absolute bottom-3 left-3 flex h-8 items-center rounded-full bg-black/40 px-3 text-[13px] font-semibold text-white backdrop-blur">
                  Intro reel
                </span>
                <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-white/30 text-white backdrop-blur">
                  ▶
                </span>
              </button>
            ) : (
              <div className="aspect-[5/4] rounded-gc-lg bg-[#eee]" />
            )}

            <div className="flex flex-col gap-2 px-2">
              <h1 className="m-0 flex items-center gap-2 text-[26px] font-bold leading-tight tracking-[-0.02em]">
                {model.headline}
                {model.verified && (
                  <VerifiedTick className="size-5.5 bg-[#3B82F6]" />
                )}
              </h1>
              <span className="text-[15px] text-gc-muted-soft">
                {[model.creatorTypeLabel, model.locationLabel]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {model.bio && (
                <>
                  <p
                    className={cn(
                      "m-0 mt-0.5 text-pretty text-base leading-relaxed text-[#555]",
                      bioIsLong && !bioOpen && "line-clamp-3",
                    )}
                  >
                    {model.bio}
                  </p>
                  {bioIsLong && (
                    <button
                      type="button"
                      onClick={() => setBioOpen((open) => !open)}
                      className="h-7 self-start text-[15px] font-bold text-[#141414]"
                    >
                      {bioOpen ? "Show less" : "Read more"}
                    </button>
                  )}
                </>
              )}
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-3 py-1">
                {stats.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={cn(
                      "flex flex-col items-center gap-0.75",
                      index > 0 && "border-l border-[#E6E6E6]",
                    )}
                  >
                    <span className="text-[21px] font-bold tracking-[-0.02em]">
                      {stat.value}
                    </span>
                    <span className="text-sm text-gc-muted-soft">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={scrollToPackage}
              className="flex h-14.5 items-center justify-center gap-2.5 rounded-full bg-[#0A0A0A] text-[17px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              <Zap className="size-5" />
              Book now · {priceLabel}
            </button>

            {showTrustLine && selectedPackage && (
              <div className="-mt-1 flex flex-wrap justify-center gap-x-3.5 gap-y-1 text-[13px] text-gc-muted-soft">
                <span className="flex items-center gap-1.25">
                  <span className="font-extrabold text-gc-success">✓</span>
                  {selectedPackage.deliveryLabel} delivery
                </span>
                <span className="flex items-center gap-1.25">
                  <span className="font-extrabold text-gc-success">✓</span>
                  Secure payment
                </span>
              </div>
            )}
          </div>
        </section>

        {/* --------------------------------------------------------- content */}
        <main className="flex min-w-0 flex-1 basis-140 flex-col">
          {(model.categories.length > 0 || model.languages.length > 0) && (
            <section className="flex flex-wrap gap-1.5 pt-1">
              {model.categories.map((category, index) => (
                <span
                  key={category}
                  className={cn(
                    "flex h-9 items-center rounded-[10px] px-3.5 text-[15px] font-semibold",
                    CATEGORY_TINTS[index % CATEGORY_TINTS.length],
                  )}
                >
                  {category}
                </span>
              ))}
              {model.languages.map((language) => (
                <span
                  key={language}
                  className="flex h-9 items-center rounded-[10px] bg-gc-tint-sky px-3.5 text-[15px] font-semibold text-gc-tint-sky-ink"
                >
                  {language}
                </span>
              ))}
            </section>
          )}

          {model.portfolio.length > 0 && (
            <section className="pt-10">
              <div className="mb-3 flex items-baseline justify-between px-0.5">
                <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
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
                className="grid-cols-3 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]"
                tileClassName="rounded-gc-md"
              />
            </section>
          )}

          <section className="pt-10">
            <div className="flex flex-col gap-4 rounded-gc-lg border border-[#eee] bg-white p-4 pt-5">
              <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.03em]">
                About this creator
              </h2>
              <FactTiles facts={model.facts} openTo={model.openTo} />
            </div>
          </section>

          {audienceSlot}

          {reviews && (
            <ReviewsSection
              reviews={reviews}
              className="pt-10"
              cardClassName="rounded-gc-md bg-[#F4F4F5]"
              heading={
                <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em]">
                  What brands say
                </h2>
              }
            />
          )}

          {/* ------------------------------------------------------- package */}
          {selectedPackage && (
            <section id="package" className="scroll-mt-5 pt-10">
              <div className="rounded-gc-xl bg-[linear-gradient(160deg,#FFF0F3,#F3EDFF)] p-2">
                <div className="relative h-80 overflow-hidden rounded-gc-lg bg-neutral-800">
                  {packageImage && (
                    // eslint-disable-next-line @next/next/no-img-element -- remote S3 thumbnail
                    <img
                      src={packageImage}
                      alt=""
                      className="absolute inset-0 size-full object-cover object-[center_25%]"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,.92)_0%,rgba(0,0,0,.6)_45%,rgba(0,0,0,0)_75%)]" />
                  <div className="absolute inset-x-4.5 bottom-4 flex flex-col gap-3.5 text-white">
                    <div>
                      <div className="text-[15px] text-white/75">
                        {selectedPackage.name} · from
                      </div>
                      <div className="text-[2.75rem] font-extrabold leading-none tracking-[-0.045em]">
                        {selectedPackage.priceLabel}
                      </div>
                    </div>
                    <div className="grid grid-cols-3">
                      {[
                        {
                          label: "Delivery",
                          value: selectedPackage.deliveryLabel,
                        },
                        {
                          label: "Length",
                          value: selectedPackage.lengthLabel,
                        },
                        {
                          label: "Revisions",
                          value: selectedPackage.revisionsLabel,
                        },
                      ].map((term, index) => (
                        <div
                          key={term.label}
                          className={cn(
                            "flex flex-col items-center gap-0.5",
                            index > 0 && "border-l border-white/20",
                          )}
                        >
                          <span className="text-[19px] font-bold">
                            {term.value}
                          </span>
                          <span className="text-[13px] text-white/65">
                            {term.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <BookingPanelBody
                  model={model}
                  addOnStyle="box"
                  className="px-2.5 pb-1 pt-3.5"
                  ctaClassName="bg-[#0E0E10] hover:bg-[#262628]"
                  checkClassName="bg-transparent text-gc-brand"
                />
              </div>
            </section>
          )}

          <footer className="flex flex-col gap-2 pt-10 text-[13px] leading-relaxed text-gc-muted-faint">
            <span>
              © {new Date().getFullYear()} GoCollab · This public profile is
              shared by the creator. Bookings &amp; payments are handled
              securely on GoCollab.
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
          scrollToPackage();
        }}
        bookLabel={`Book · ${priceLabel}`}
      />
    </div>
  );
}
