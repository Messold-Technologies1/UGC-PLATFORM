"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MapPin,
  Globe,
  Star,
  CheckCircle2,
  Play,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Clock,
  Film,
  RefreshCw,
  ArrowRight,
  Check,
  Plus,
  Zap,
  Users,
  Baby,
  PawPrint,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreatorRatingReviewsQuery } from "../../hooks/use-creator-rating-reviews-query";
import { usePublicPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-public-portfolio-videos-query";
import type { CreatorProfileItemApi } from "../../api/types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

interface PublicCreatorProfileProps {
  profile: CreatorProfileItemApi;
  initialPortfolioVideos?: PortfolioVideoApi[];
}

const ACCENT_ORDER = ["lime", "pink", "sky", "grape"] as const;
type Accent = (typeof ACCENT_ORDER)[number];

const ACCENT_BG: Record<Accent, string> = {
  lime: "bg-[#c6ff3d] text-[#181313]",
  pink: "bg-[#ff5da2] text-white",
  sky: "bg-[#62d6ff] text-[#181313]",
  grape: "bg-[#8b5cf6] text-white",
};

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

function formatPrice(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function Sticker({
  tone = "lime",
  children,
}: {
  tone?: Accent;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-[#181313] px-3 py-1 font-heading text-[11px] font-extrabold uppercase tracking-[0.14em] shadow-[0_4px_0_rgb(24_19_19/0.9)]",
        ACCENT_BG[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PublicCreatorProfile({
  profile,
  initialPortfolioVideos,
}: PublicCreatorProfileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const reviewsQuery = useCreatorRatingReviewsQuery(profile.id, {
    page: 1,
    limit: 10,
  });
  const reviewSummary = reviewsQuery.data;
  const totalReviews = reviewSummary?.reviewCount ?? profile.reviewCount ?? 0;
  const overallRating =
    Number.parseFloat(reviewSummary?.avgRating ?? profile.avgRating ?? "0") ||
    0;
  const reviews = reviewSummary?.items ?? [];

  const portfolioQuery = usePublicPortfolioVideosQuery(profile.id, {
    initialData: initialPortfolioVideos,
  });
  const portfolioVideos = useMemo(
    () =>
      (portfolioQuery.data ?? []).filter(
        (v) => v.videoUrl && v.videoUrl !== profile.introVideoUrl,
      ),
    [portfolioQuery.data, profile.introVideoUrl],
  );

  const locationString = useMemo(
    () =>
      [profile.city, profile.stateName, profile.countryName]
        .filter(Boolean)
        .join(", ") || "Location not set",
    [profile.city, profile.stateName, profile.countryName],
  );

  const languages = useMemo(
    () => (profile.profileLanguages ?? []).map((l) => l.label),
    [profile.profileLanguages],
  );

  const contentCategories = useMemo(
    () =>
      (profile.facetSelections ?? [])
        .filter((f) => f.dimension === "CONTENT_CATEGORY")
        .map((f) => f.label.replace(/\s*\/\s*/g, " & ")),
    [profile.facetSelections],
  );

  const canCreateWith = useMemo(
    () =>
      (profile.facetSelections ?? []).filter(
        (f) => f.dimension === "CAN_CREATE_WITH",
      ),
    [profile.facetSelections],
  );

  const industryExperience = useMemo(
    () =>
      (profile.facetSelections ?? [])
        .filter((f) => f.dimension === "CATEGORY_EXPERIENCE")
        .map((f) => f.label.replace(/\s*\/\s*/g, " & ")),
    [profile.facetSelections],
  );

  const contentStyles = useMemo(
    () =>
      (profile.facetSelections ?? [])
        .filter((f) => f.dimension === "CONTENT_STYLE")
        .map((f) => f.label),
    [profile.facetSelections],
  );

  const packages = profile.packages ?? [];
  const addOns = profile.addOns ?? [];
  const primaryPackage = packages[0];
  const startingPrice = formatPrice(primaryPackage?.priceAmount);

  const totalOrders = profile.totalOrders ?? profile.completedOrders ?? 0;
  const collaborationCount = profile.collaborationCount ?? 0;

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  };

  const initials = getInitials(profile.displayName);
  const bookHref = "/register/brand";

  const canCreateIcon: Record<string, typeof Users> = {
    Partner: Users,
    Kids: Baby,
    Pets: PawPrint,
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] font-sans text-[#181313]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-40 border-b-2 border-[#181313] bg-[#fdfcfb]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-extrabold tracking-tight"
          >
            <span className="flex size-7 items-center justify-center rounded-md border-2 border-[#181313] bg-[#c6ff3d] shadow-[3px_3px_0_rgb(24_19_19)]">
              <Sparkles className="size-3.5" strokeWidth={2.5} />
            </span>
            GoCollab
          </Link>

          <Link
            href={bookHref}
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#181313] bg-[#181313] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_rgb(24_19_19)] transition-transform hover:-translate-y-0.5"
          >
            Book {profile.displayName.split(" ")[0]}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 py-10">
        {/* HERO */}
        <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-5">
            <Sticker tone="lime">
              <CheckCircle2 className="size-3.5" strokeWidth={3} /> Live Creator
              Profile
            </Sticker>

            <div className="flex items-start gap-5">
              {profile.profileImageUrl ? (
                <img
                  src={profile.profileImageUrl}
                  alt={profile.displayName}
                  className="size-24 shrink-0 rounded-full border-2 border-[#181313] object-cover shadow-[4px_4px_0_rgb(24_19_19)]"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-2 border-[#181313] bg-[#ff5da2] font-heading text-2xl font-extrabold text-white shadow-[4px_4px_0_rgb(24_19_19)]">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
                  {profile.displayName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#181313]/70">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {locationString}
                  </span>
                  {languages.length > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Globe className="size-3.5" /> {languages.join(", ")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {profile.bio && (
              <p className="max-w-2xl text-base leading-relaxed text-[#181313]/80">
                {profile.bio}
              </p>
            )}

            {contentCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contentCategories.slice(0, 8).map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border-2 border-[#181313] bg-white px-3 py-1 text-xs font-bold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}

            {/* STATS STRIP */}
            <div className="mt-3 grid grid-cols-3 gap-3 sm:max-w-md">
              <StatBlock
                tone="sky"
                value={
                  totalReviews > 0 ? overallRating.toFixed(1) : "—"
                }
                label={totalReviews > 0 ? "Avg rating" : "New creator"}
                icon={<Star className="size-4 fill-[#181313]" />}
              />
              <StatBlock
                tone="lime"
                value={totalOrders.toString()}
                label="Orders"
                icon={<CheckCircle2 className="size-4" strokeWidth={3} />}
              />
              <StatBlock
                tone="grape"
                value={
                  primaryPackage
                    ? `${primaryPackage.deliveryDays}d`
                    : "—"
                }
                label="Delivery"
                icon={<Clock className="size-4" />}
              />
            </div>

            {/* CTAs */}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                href={bookHref}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#181313] bg-[#ff5da2] px-5 py-3 font-heading text-sm font-extrabold text-white shadow-[6px_6px_0_rgb(24_19_19)] transition-transform hover:-translate-y-0.5"
              >
                <Zap className="size-4" /> Book this creator
              </Link>
              {startingPrice > 0 && (
                <span className="text-sm text-[#181313]/70">
                  Starts at{" "}
                  <strong className="text-[#181313]">
                    ₹{startingPrice.toLocaleString("en-IN")}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* INTRO VIDEO */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            {profile.introVideoUrl ? (
              <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border-2 border-[#181313] bg-black shadow-[6px_6px_0_rgb(24_19_19)]">
                <video
                  ref={videoRef}
                  src={profile.introVideoUrl}
                  poster={profile.profileImageUrl ?? undefined}
                  className="size-full object-cover"
                  playsInline
                  controls={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 transition hover:bg-black/40"
                    aria-label="Play intro video"
                  >
                    <span className="flex size-16 items-center justify-center rounded-full border-2 border-[#181313] bg-[#c6ff3d] text-[#181313] shadow-[4px_4px_0_rgb(24_19_19)]">
                      <Play
                        className="size-7 fill-[#181313]"
                        strokeWidth={0}
                      />
                    </span>
                  </button>
                )}
                <div className="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md border-2 border-[#181313] bg-[#fdfcfb] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-[3px_3px_0_rgb(24_19_19)]">
                  <Play className="size-2.5 fill-[#181313]" strokeWidth={0} />
                  Intro
                </div>
              </div>
            ) : (
              <div className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border-2 border-dashed border-[#181313]/30 bg-white text-sm font-medium text-[#181313]/50">
                No intro video yet
              </div>
            )}
          </div>
        </section>

        {/* DETAIL ROW */}
        <section className="mt-14 grid gap-6 md:grid-cols-3">
          <DetailCard tone="lime" title="What I create" icon={Film}>
            {contentStyles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {contentStyles.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-[#181313]/15 bg-white px-2 py-0.5 text-xs font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#181313]/70">
                Style breakdown coming soon.
              </p>
            )}
          </DetailCard>

          <DetailCard tone="pink" title="Industry experience" icon={Sparkles}>
            {industryExperience.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {industryExperience.slice(0, 5).map((ind) => (
                  <li key={ind} className="flex items-center gap-2">
                    <Check className="size-3.5" strokeWidth={3} /> {ind}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#181313]/70">
                Open to all categories.
              </p>
            )}
          </DetailCard>

          <DetailCard tone="sky" title="Can create with" icon={Users}>
            {canCreateWith.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {canCreateWith.map((f) => {
                  const Icon = canCreateIcon[f.label] || Users;
                  return (
                    <div
                      key={f.slug}
                      className="flex items-center gap-2 rounded-md border border-[#181313]/15 bg-white px-2 py-1 text-xs font-semibold"
                    >
                      <Icon className="size-3.5" />
                      {f.label}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#181313]/70">Solo creator.</p>
            )}
          </DetailCard>
        </section>

        {/* PORTFOLIO */}
        <section className="mt-16">
          <SectionHeader
            eyebrow="Portfolio"
            tone="sky"
            title="Recent work"
            subtitle={`${portfolioVideos.length} portfolio video${portfolioVideos.length === 1 ? "" : "s"}`}
          />

          {portfolioVideos.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {portfolioVideos.map((video) => (
                <PortfolioTile key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-xl border-2 border-dashed border-[#181313]/20 bg-white px-6 py-10 text-center text-sm text-[#181313]/60">
              No portfolio videos yet.
            </p>
          )}
        </section>

        {/* PACKAGES */}
        {packages.length > 0 && (
          <section className="mt-16">
            <SectionHeader
              eyebrow="Pricing"
              tone="lime"
              title="Packages"
              subtitle="Pick a tier — pricing is fixed, no hidden fees."
            />

            <div
              className={cn(
                "mt-6 grid gap-5",
                packages.length === 1 && "md:grid-cols-1 max-w-md",
                packages.length === 2 && "md:grid-cols-2",
                packages.length >= 3 && "md:grid-cols-3",
              )}
            >
              {packages.map((pkg, i) => {
                const tone: Accent = ACCENT_ORDER[i % ACCENT_ORDER.length]!;
                const isFeatured = packages.length >= 2 && i === 1;
                return (
                  <PackageCard
                    key={pkg.id}
                    name={pkg.name}
                    price={formatPrice(pkg.priceAmount)}
                    deliveryDays={pkg.deliveryDays}
                    revisions={pkg.maxRevisions}
                    videoSeconds={pkg.videoLengthSeconds}
                    deliverables={
                      ((pkg as { deliverables?: string[] }).deliverables ?? []) as string[]
                    }
                    tone={tone}
                    featured={isFeatured}
                    bookHref={bookHref}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ADD-ONS */}
        {addOns.length > 0 && (
          <section className="mt-16">
            <SectionHeader
              eyebrow="Extras"
              tone="grape"
              title="Add-ons"
              subtitle="Optional upgrades — add them at checkout."
            />

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {addOns.map((addon) => (
                <div
                  key={addon.id}
                  className="flex flex-col gap-2 rounded-2xl border-2 border-[#181313] bg-white p-5 shadow-[5px_5px_0_rgb(24_19_19)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex size-9 items-center justify-center rounded-md border-2 border-[#181313] bg-[#8b5cf6] text-white">
                      <Plus className="size-4" strokeWidth={3} />
                    </div>
                    <span className="rounded-full border-2 border-[#181313] bg-[#c6ff3d] px-2.5 py-0.5 text-xs font-extrabold">
                      +₹{formatPrice(addon.priceAmount).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-1 font-heading text-base font-bold leading-snug">
                    {addon.name}
                  </p>
                  {addon.description && (
                    <p className="text-xs leading-relaxed text-[#181313]/70">
                      {addon.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* REVIEWS — only if there are any */}
        {totalReviews > 0 && reviews.length > 0 && (
          <section className="mt-16">
            <SectionHeader
              eyebrow="Reviews"
              tone="pink"
              title="What brands say"
              subtitle={`Based on ${totalReviews} verified order${totalReviews === 1 ? "" : "s"}`}
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-5 rounded-2xl border-2 border-[#181313] bg-[#ff5da2]/15 p-6 shadow-[5px_5px_0_rgb(24_19_19)]">
                <div className="text-center">
                  <p className="font-heading text-5xl font-extrabold leading-none">
                    {overallRating.toFixed(1)}
                  </p>
                  <div className="mt-2 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn(
                          "size-4",
                          i <= Math.round(overallRating)
                            ? "fill-[#181313] text-[#181313]"
                            : "fill-transparent text-[#181313]/30",
                        )}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#181313]/70">
                    {totalReviews} review{totalReviews === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = reviews.filter(
                      (r) => Math.round(r.rating) === s,
                    ).length;
                    const pct =
                      totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                    return (
                      <div
                        key={s}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span className="w-3 text-right font-bold">{s}</span>
                        <Star className="size-3 fill-[#181313]" />
                        <div className="h-2 flex-1 overflow-hidden rounded-full border border-[#181313]/20 bg-white">
                          <div
                            className="h-full bg-[#181313]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-6 text-right font-bold">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                {reviews.slice(0, 3).map((review) => {
                  const brandName = review.brand?.brandName ?? "Brand";
                  const dateStr = review.createdAt
                    ? new Date(review.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "";
                  return (
                    <div
                      key={review.id}
                      className="rounded-2xl border-2 border-[#181313] bg-white p-4 shadow-[4px_4px_0_rgb(24_19_19)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-9 items-center justify-center rounded-full border-2 border-[#181313] bg-[#62d6ff] text-xs font-extrabold">
                            {brandName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold leading-tight">
                              {brandName}
                            </p>
                            <p className="text-[11px] text-[#181313]/60">
                              {dateStr}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={cn(
                                "size-3.5",
                                i <= review.rating
                                  ? "fill-[#181313] text-[#181313]"
                                  : "fill-transparent text-[#181313]/30",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      {review.review && (
                        <p className="mt-2 text-sm leading-relaxed text-[#181313]/80">
                          {review.review}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* TRUST BAR */}
        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          <TrustItem
            icon={ShieldCheck}
            title="Secure payments"
            body="Razorpay-protected checkout"
          />
          <TrustItem
            icon={RotateCcw}
            title="Refunds & revisions"
            body="Built-in revision flow"
          />
          <TrustItem
            icon={Sparkles}
            title="Vetted creator"
            body="Approved & verified profile"
          />
        </section>

        {/* BIG CTA */}
        <section className="mt-16">
          <div className="relative overflow-hidden rounded-3xl border-2 border-[#181313] bg-[#181313] p-10 text-white shadow-[8px_8px_0_rgb(24_19_19)]">
            <div className="relative z-10 flex flex-col items-start gap-5 md:flex-row md:items-center md:justify-between">
              <div className="max-w-xl">
                <p className="font-heading text-xs font-extrabold uppercase tracking-[0.18em] text-[#c6ff3d]">
                  Ready to collab?
                </p>
                <h2 className="mt-3 font-heading text-3xl font-extrabold leading-tight sm:text-4xl">
                  Book {profile.displayName.split(" ")[0]} on GoCollab.
                </h2>
                <p className="mt-3 text-sm text-white/70">
                  Sign up as a brand, send a brief, and get content delivered.
                </p>
              </div>
              <Link
                href={bookHref}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[#181313] bg-[#c6ff3d] px-6 py-3 font-heading text-sm font-extrabold text-[#181313] shadow-[5px_5px_0_rgb(0_0_0)] transition-transform hover:-translate-y-0.5"
              >
                Get started <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[#181313]/10 py-8">
        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-2 px-6 text-xs text-[#181313]/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} GoCollab</p>
          <p>Public creator profile · share with anyone</p>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ Sub-components ------------------------------ */

function StatBlock({
  tone,
  value,
  label,
  icon,
}: {
  tone: Accent;
  value: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-[#181313] p-3 shadow-[4px_4px_0_rgb(24_19_19)]",
        ACCENT_BG[tone],
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="mt-1 font-heading text-2xl font-extrabold leading-none">
        {value}
      </p>
    </div>
  );
}

function DetailCard({
  tone,
  title,
  icon: Icon,
  children,
}: {
  tone: Accent;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-[#181313] bg-white p-5 shadow-[5px_5px_0_rgb(24_19_19)]">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-md border-2 border-[#181313]",
            ACCENT_BG[tone],
          )}
        >
          <Icon className="size-4" strokeWidth={2.5} />
        </span>
        <h3 className="font-heading text-base font-extrabold">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  tone,
  title,
  subtitle,
}: {
  eyebrow: string;
  tone: Accent;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Sticker tone={tone}>{eyebrow}</Sticker>
      <h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-[#181313]/70">{subtitle}</p>
      )}
    </div>
  );
}

function PortfolioTile({ video }: { video: PortfolioVideoApi }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);

  return (
    <div
      className="group relative aspect-[9/16] overflow-hidden rounded-2xl border-2 border-[#181313] bg-black shadow-[4px_4px_0_rgb(24_19_19)]"
      onMouseEnter={() => {
        setHovered(true);
        ref.current?.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (ref.current) {
          ref.current.pause();
          ref.current.currentTime = 0;
        }
      }}
    >
      <video
        ref={ref}
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        className="size-full object-cover"
        muted
        loop
        playsInline
        preload="metadata"
      />
      {!hovered && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-transparent">
          <span className="flex size-12 items-center justify-center rounded-full border-2 border-[#181313] bg-[#c6ff3d] shadow-[3px_3px_0_rgb(24_19_19)]">
            <Play className="size-5 fill-[#181313]" strokeWidth={0} />
          </span>
        </div>
      )}
      {video.industryLabel && (
        <span className="absolute bottom-2 left-2 rounded-md border border-[#181313] bg-white/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
          {video.industryLabel}
        </span>
      )}
    </div>
  );
}

interface PackageCardProps {
  name: string;
  price: number;
  deliveryDays: number;
  revisions: number;
  videoSeconds?: number | null;
  deliverables: string[];
  tone: Accent;
  featured: boolean;
  bookHref: string;
}

function PackageCard({
  name,
  price,
  deliveryDays,
  revisions,
  videoSeconds,
  deliverables,
  tone,
  featured,
  bookHref,
}: PackageCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border-2 border-[#181313] bg-white p-6 shadow-[6px_6px_0_rgb(24_19_19)]",
        featured && "ring-2 ring-offset-2 ring-[#181313]",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#181313] bg-[#ff5da2] px-3 py-0.5 font-heading text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[3px_3px_0_rgb(24_19_19)]">
          Popular
        </span>
      )}
      <span
        className={cn(
          "self-start rounded-md border-2 border-[#181313] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest",
          ACCENT_BG[tone],
        )}
      >
        {tone === "lime"
          ? "Starter"
          : tone === "pink"
            ? "Standard"
            : tone === "sky"
              ? "Premium"
              : "Custom"}
      </span>
      <p className="mt-3 font-heading text-lg font-extrabold">{name}</p>
      <p className="mt-1 font-heading text-3xl font-extrabold tracking-tight">
        ₹{price.toLocaleString("en-IN")}
      </p>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <Clock className="size-3.5" /> {deliveryDays} day delivery
        </li>
        {videoSeconds ? (
          <li className="flex items-center gap-2">
            <Film className="size-3.5" /> {videoSeconds}s video
          </li>
        ) : null}
        <li className="flex items-center gap-2">
          <RefreshCw className="size-3.5" /> {revisions} revision
          {revisions === 1 ? "" : "s"}
        </li>
        {deliverables.slice(0, 4).map((d) => (
          <li
            key={d}
            className="flex items-center gap-2 text-[#181313]/80"
          >
            <Check className="size-3.5" strokeWidth={3} /> {d}
          </li>
        ))}
      </ul>
      <Link
        href={bookHref}
        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-[#181313] bg-[#181313] px-4 py-2 text-sm font-extrabold text-white shadow-[3px_3px_0_rgb(24_19_19)] transition-transform hover:-translate-y-0.5"
      >
        Choose {name} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function TrustItem({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border-2 border-[#181313] bg-white p-5 shadow-[4px_4px_0_rgb(24_19_19)]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-[#181313] bg-[#c6ff3d]">
        <Icon className="size-4" strokeWidth={2.5} />
      </span>
      <div>
        <p className="font-heading text-sm font-extrabold">{title}</p>
        <p className="text-xs text-[#181313]/70">{body}</p>
      </div>
    </div>
  );
}
