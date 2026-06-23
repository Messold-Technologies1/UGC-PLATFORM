"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Globe,
  Star,
  CheckCircle2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Zap,
  MessageCircle,
  ArrowRight,
  Check,
  ShieldCheck,
  Sparkles,
  Film,
  Clock,
  RefreshCw,
  MapPinned,
  Users,
  Layers,
  Tag,
  User,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicAuthUser } from "@/features/auth/hooks/use-me-query";
import { useCreatorRatingReviewsQuery } from "../../hooks/use-creator-rating-reviews-query";
import { usePublicPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-public-portfolio-videos-query";
import type { CreatorProfileItemApi } from "../../api/types";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";

interface PublicCreatorProfileProps {
  profile: CreatorProfileItemApi;
  initialPortfolioVideos?: PortfolioVideoApi[];
}

const BRAND_RED = "#e63950";

const CATEGORY_PILL_TONES = [
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-pink-100 text-pink-700",
];

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

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatINR(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function handleFromName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ".");
}

type AboutTone =
  | "rose"
  | "violet"
  | "amber"
  | "sky"
  | "emerald"
  | "fuchsia"
  | "cyan"
  | "lime"
  | "pink"
  | "orange"
  | "neutral";

type AboutSectionDef = {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  tone: AboutTone;
  items: (string | { label: string; sub?: string | null })[];
  wide?: boolean;
};

const ABOUT_TONE: Record<
  AboutTone,
  { iconBg: string; iconText: string; subText: string }
> = {
  rose: {
    iconBg: "bg-rose-100",
    iconText: "text-rose-600",
    subText: "text-neutral-500",
  },
  violet: {
    iconBg: "bg-violet-100",
    iconText: "text-violet-600",
    subText: "text-neutral-500",
  },
  amber: {
    iconBg: "bg-amber-100",
    iconText: "text-amber-600",
    subText: "text-neutral-500",
  },
  sky: {
    iconBg: "bg-sky-100",
    iconText: "text-sky-600",
    subText: "text-neutral-500",
  },
  emerald: {
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-600",
    subText: "text-neutral-500",
  },
  fuchsia: {
    iconBg: "bg-fuchsia-100",
    iconText: "text-fuchsia-600",
    subText: "text-neutral-500",
  },
  cyan: {
    iconBg: "bg-cyan-100",
    iconText: "text-cyan-600",
    subText: "text-neutral-500",
  },
  lime: {
    iconBg: "bg-lime-100",
    iconText: "text-lime-700",
    subText: "text-neutral-500",
  },
  pink: {
    iconBg: "bg-pink-100",
    iconText: "text-pink-600",
    subText: "text-neutral-500",
  },
  orange: {
    iconBg: "bg-orange-100",
    iconText: "text-orange-600",
    subText: "text-neutral-500",
  },
  neutral: {
    iconBg: "bg-neutral-100",
    iconText: "text-neutral-500",
    subText: "text-neutral-400",
  },
};

function AboutSectionsGrid({
  sections,
}: {
  sections: AboutSectionDef[];
}) {
  if (sections.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
      {sections.map((section) => (
        <AboutGroup key={section.label} {...section} />
      ))}
    </div>
  );
}

function AboutGroup({
  icon: Icon,
  label,
  tone,
  items,
  wide = false,
}: AboutSectionDef) {
  if (items.length === 0) return null;
  const t = ABOUT_TONE[tone];

  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-100 bg-neutral-50/50 p-4",
        wide && "sm:col-span-2",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            t.iconBg,
            t.iconText,
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.5} />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          {label}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((it, i) => {
          const isObj = typeof it === "object";
          const text = isObj ? it.label : it;
          const sub = isObj ? it.sub : null;
          return (
            <span
              key={`${text}-${i}`}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-neutral-200/80 bg-white px-2.5 py-1 text-[11px] font-medium leading-snug text-neutral-700 shadow-sm"
            >
              <span>{text}</span>
              {sub && (
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-normal",
                    t.subText,
                  )}
                >
                  {sub}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function PublicCreatorProfile({
  profile,
  initialPortfolioVideos,
}: PublicCreatorProfileProps) {
  // Always re-fetch auth on mount so a user who just logged in is detected
  // immediately without needing a manual page reload.
  const { data: meUser } = usePublicAuthUser();
  const isBrand = meUser?.roles?.includes("BRAND") ?? false;
  const router = useRouter();

  const bookHref = "/register/brand";
  // Logged-in brands go to the authenticated creator page which has the full
  // OrderModal + Razorpay checkout inside AuthProvider context
  const brandBookHref = `/brand/creators?creatorId=${profile.id}`;


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
  const allPortfolioVideos = useMemo(
    () => (portfolioQuery.data ?? []).filter((v) => v.videoUrl),
    [portfolioQuery.data],
  );
  const portfolioVideos = useMemo(
    () => allPortfolioVideos.filter((v) => v.videoUrl !== profile.introVideoUrl),
    [allPortfolioVideos, profile.introVideoUrl],
  );
  const firstPortfolioVideo = allPortfolioVideos[0] ?? null;

  const locationString = useMemo(() => {
    const parts = [profile.city, profile.stateName, profile.countryName].filter(
      Boolean,
    );
    return parts.length > 0 ? parts.join(", ") : null;
  }, [profile.city, profile.stateName, profile.countryName]);

  const languages = useMemo(
    () => profile.profileLanguages ?? [],
    [profile.profileLanguages],
  );

  const facetsByDim = useMemo(() => {
    const groups: Record<string, { slug: string; label: string }[]> = {};
    for (const f of profile.facetSelections ?? []) {
      (groups[f.dimension] ||= []).push({ slug: f.slug, label: f.label });
    }
    return groups;
  }, [profile.facetSelections]);

  const contentCategories = facetsByDim.CONTENT_CATEGORY ?? [];
  const contentFormats = facetsByDim.CONTENT_FORMAT ?? [];
  const contentStyles = facetsByDim.CONTENT_STYLE ?? [];
  const productionCapabilities = facetsByDim.PRODUCTION_CAPABILITY ?? [];
  const categoryExperience = facetsByDim.CATEGORY_EXPERIENCE ?? [];
  const appearance = facetsByDim.APPEARANCE ?? [];
  const occupation = facetsByDim.OCCUPATION ?? [];
  const canCreateWith = facetsByDim.CAN_CREATE_WITH ?? [];
  const brandsWorkedWith =
    profile.highlights && profile.highlights.length > 0
      ? profile.highlights.map((h) => ({ slug: h, label: h }))
      : facetsByDim.BRANDS_WORKED_WITH ?? [];

  const aboutSections = useMemo(() => {
    const sections: AboutSectionDef[] = [];

    if (contentCategories.length > 0) {
      sections.push({
        icon: Tag,
        label: "Content category",
        tone: "rose",
        items: contentCategories.map((f) => f.label),
        wide: contentCategories.length > 3,
      });
    }
    if (contentFormats.length > 0) {
      sections.push({
        icon: Film,
        label: "Content formats",
        tone: "violet",
        items: contentFormats.map((f) => f.label),
      });
    }
    if (contentStyles.length > 0) {
      sections.push({
        icon: Sparkles,
        label: "Style",
        tone: "amber",
        items: contentStyles.map((f) => f.label),
      });
    }
    if (appearance.length > 0) {
      sections.push({
        icon: User,
        label: "Appearance",
        tone: "pink",
        items: appearance.map((f) => f.label),
      });
    }
    if (occupation.length > 0) {
      sections.push({
        icon: Briefcase,
        label: "Occupation",
        tone: "orange",
        items: occupation.map((f) => f.label),
      });
    }
    if (languages.length > 0) {
      sections.push({
        icon: Globe,
        label: "Languages",
        tone: "sky",
        items: languages.map((l) => ({
          label: l.label,
          sub: l.fluency
            ? l.fluency.charAt(0) + l.fluency.slice(1).toLowerCase()
            : null,
        })),
      });
    }
    if (productionCapabilities.length > 0) {
      sections.push({
        icon: CheckCircle2,
        label: "Production",
        tone: "emerald",
        items: productionCapabilities.map((f) => f.label),
      });
    }
    if (categoryExperience.length > 0) {
      sections.push({
        icon: ShieldCheck,
        label: "Industry experience",
        tone: "fuchsia",
        items: categoryExperience.map((f) => f.label),
        wide: categoryExperience.length > 2,
      });
    }
    if (canCreateWith.length > 0) {
      sections.push({
        icon: Users,
        label: "Can create with",
        tone: "cyan",
        items: canCreateWith.map((f) => f.label),
      });
    }
    sections.push({
      icon: MapPinned,
      label: "On-location shoot",
      tone: profile.onLocationAvailable ? "emerald" : "neutral",
      items: [
        profile.onLocationAvailable ? "Available" : "Not available",
      ],
    });
    if (brandsWorkedWith.length > 0) {
      sections.push({
        icon: Sparkles,
        label: "Worked with",
        tone: "lime",
        items: brandsWorkedWith.map((b) => b.label),
        wide: true,
      });
    }

    return sections;
  }, [
    appearance,
    brandsWorkedWith,
    canCreateWith,
    categoryExperience,
    contentCategories,
    contentFormats,
    contentStyles,
    languages,
    occupation,
    productionCapabilities,
    profile.onLocationAvailable,
  ]);

  const packages = profile.packages ?? [];
  const addOns = profile.addOns ?? [];
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    packages[0]?.id ?? null,
  );
  const [selectedAddOns, setSelectedAddOns] = useState<Set<string>>(new Set());

  const selectedPackage =
    packages.find((p) => p.id === selectedPackageId) ?? packages[0];

  const addOnsTotal = useMemo(
    () =>
      addOns
        .filter((a) => selectedAddOns.has(a.id))
        .reduce((sum, a) => sum + toNumber(a.priceAmount), 0),
    [addOns, selectedAddOns],
  );

  const packagePrice = selectedPackage ? toNumber(selectedPackage.priceAmount) : 0;
  const totalPrice = packagePrice + addOnsTotal;

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ratingHistogram = useMemo(() => {
    const buckets: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const r of reviews) {
      const k = Math.max(1, Math.min(5, Math.round(r.rating))) as
        | 1
        | 2
        | 3
        | 4
        | 5;
      buckets[k]++;
    }
    return buckets;
  }, [reviews]);

  const [playingPortfolioId, setPlayingPortfolioId] = useState<string | null>(null);

  const handleBookClick = () => {
    router.push(isBrand ? brandBookHref : bookHref);
  };

  const handle = `@${handleFromName(profile.displayName)}`;
  const firstName = profile.displayName.split(" ")[0] || profile.displayName;
  const initials = getInitials(profile.displayName);
  const collabCount = profile.collaborationCount ?? 0;
  const isTopCreator = (profile.totalOrders ?? profile.completedOrders ?? 0) >= 10 || overallRating >= 4.5;
  const primaryNiche = contentCategories[0]?.label ?? null;

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 antialiased">
      {/* HEADER */}
      <header className="sticky top-0 z-40 overflow-visible border-b border-neutral-200/70 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between overflow-visible px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 overflow-visible"
          >
            <span className="flex h-9 shrink-0 items-center overflow-visible sm:h-10">
              {/* eslint-disable-next-line @next/next/no-img-element -- static public asset; matches navbar brand mark */}
              <img
                src="/brand-logo.png"
                alt="GoCollab"
                width={688}
                height={180}
                className="h-16 w-auto max-w-[min(320px,calc(100vw-180px))] object-contain object-left sm:h-16 md:h-[4.5rem]"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </span>
            <span className="mx-2 h-4 w-px bg-neutral-300" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Creator Profile
            </span>
          </Link>
          <button
            type="button"
            onClick={handleBookClick}
            className="hidden items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 sm:inline-flex"
          >
            Book {firstName}
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </header>

      {/* HERO — soft pink gradient backdrop */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-rose-50 via-white to-white" />
        <div className="pointer-events-none absolute -right-32 -top-24 size-[420px] rounded-full bg-gradient-to-br from-rose-200/50 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-32 size-[360px] rounded-full bg-gradient-to-tr from-pink-100/60 to-transparent blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1fr_320px] lg:gap-12">
          <div className="flex flex-col justify-center gap-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <AvatarCard
                imageUrl={profile.profileImageUrl ?? null}
                initials={initials}
                isTopCreator={isTopCreator}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <h1 className="flex items-center gap-2 font-display text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl">
                  <span className="truncate">{profile.displayName}</span>
                  <VerifiedBadge />
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
                  {locationString && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {locationString}
                    </span>
                  )}
                  {languages.length > 0 && (
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="size-3.5" />
                      {languages.map((l) => l.label).join(", ")}
                    </span>
                  )}
                  {primaryNiche && (
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="size-3.5" />
                      {primaryNiche.toLowerCase()} creator
                    </span>
                  )}
                </div>

                {profile.bio && (
                  <p className="mt-1 max-w-xl text-base leading-relaxed text-neutral-700">
                    {profile.bio}
                  </p>
                )}

                {contentCategories.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {contentCategories.slice(0, 6).map((c, i) => (
                      <span
                        key={c.slug}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          CATEGORY_PILL_TONES[i % CATEGORY_PILL_TONES.length],
                        )}
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBookClick}
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                    style={{ backgroundColor: BRAND_RED }}
                  >
                    <Zap className="size-4 fill-white" strokeWidth={0} />
                    {isBrand ? `Book ${firstName}` : "Book me on GoCollab"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBookClick}
                    className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-400"
                  >
                    <MessageCircle className="size-4" />
                    {isBrand ? "Place order" : "Message"}
                  </button>
                </div>

                {collabCount > 0 && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {["bg-rose-400", "bg-amber-400", "bg-emerald-400"].map(
                        (c, i) => (
                          <span
                            key={i}
                            className={cn(
                              "size-6 rounded-full border-2 border-white",
                              c,
                            )}
                          />
                        ),
                      )}
                    </div>
                    <p className="text-xs font-medium text-neutral-600">
                      Trusted by{" "}
                      <strong className="text-neutral-900">
                        {collabCount}
                      </strong>{" "}
                      + brands
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INTRO REEL */}
          <div>
            <IntroReel
              src={profile.introVideoUrl ?? firstPortfolioVideo?.videoUrl ?? null}
              poster={profile.profileImageUrl ?? firstPortfolioVideo?.thumbnailUrl ?? null}
              label={profile.introVideoUrl ? "Intro reel" : "Portfolio reel"}
            />
          </div>
        </div>
      </section>

      {/* MAIN BODY: portfolio + details on left, sticky pricing on right */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:gap-12">
          <div className="flex flex-col gap-12">
            {/* PORTFOLIO */}
            <div>
              <SectionTitle
                icon={Film}
                title="Portfolio"
                trailing={
                  portfolioVideos.length > 0
                    ? `${portfolioVideos.length} reel${portfolioVideos.length === 1 ? "" : "s"}`
                    : undefined
                }
              />
              {portfolioVideos.length > 0 ? (
                <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {portfolioVideos.slice(0, 6).map((video) => (
                    <PortfolioTile
                      key={video.id}
                      video={video}
                      isPlayingElsewhere={playingPortfolioId !== null && playingPortfolioId !== video.id}
                      onPlay={() => setPlayingPortfolioId(video.id)}
                      onStop={() => setPlayingPortfolioId((prev) => prev === video.id ? null : prev)}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center text-sm text-neutral-500">
                  No portfolio videos yet.
                </p>
              )}
            </div>

            {/* ABOUT SECTION */}
            <div>
              <SectionTitle icon={Layers} title={`About ${firstName}`} />
              <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                {profile.bio && (
                  <div className="relative overflow-hidden border-b border-neutral-200 bg-gradient-to-br from-rose-50 via-amber-50 to-emerald-50 p-6">
                    <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-rose-200/40 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-12 -left-12 size-40 rounded-full bg-emerald-200/40 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm ring-1 ring-rose-100">
                        <Sparkles className="size-4" strokeWidth={2.5} />
                      </span>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                          Bio
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-800">
                          {profile.bio}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <AboutSectionsGrid sections={aboutSections} />
              </div>
            </div>

            {/* REVIEWS */}
            {totalReviews > 0 && (
              <div>
                <SectionTitle
                  icon={Star}
                  title="Ratings & reviews"
                  trailing={`Based on ${totalReviews} verified order${totalReviews === 1 ? "" : "s"}`}
                />

                <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2 sm:w-40">
                      <p className="font-display text-5xl font-bold leading-none text-neutral-900">
                        {overallRating.toFixed(1)}
                      </p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              "size-4",
                              i <= Math.round(overallRating)
                                ? "fill-amber-400 text-amber-400"
                                : "fill-transparent text-neutral-300",
                            )}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium text-neutral-500">
                        {totalReviews} review{totalReviews === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((s) => {
                        const count = ratingHistogram[s as 1 | 2 | 3 | 4 | 5];
                        const pct =
                          reviews.length > 0
                            ? (count / reviews.length) * 100
                            : 0;
                        return (
                          <div
                            key={s}
                            className="flex items-center gap-3 text-xs"
                          >
                            <span className="w-4 font-semibold text-neutral-700">
                              {s}
                            </span>
                            <Star className="size-3 fill-amber-400 text-amber-400" />
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full bg-amber-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-8 text-right font-medium text-neutral-500">
                              {Math.round(pct)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {reviews.slice(0, 4).map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PRICING SIDEBAR */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            {selectedPackage && (
              <PricingCard
                packages={packages}
                selectedPackage={selectedPackage}
                selectedPackageId={selectedPackageId ?? selectedPackage.id}
                onSelectPackage={setSelectedPackageId}
                addOns={addOns}
                selectedAddOns={selectedAddOns}
                onToggleAddOn={toggleAddOn}
                totalPrice={totalPrice}
                onBook={handleBookClick}
              />
            )}

          </aside>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative mt-4 overflow-hidden border-t border-neutral-200/70">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-rose-100 via-pink-50 to-white" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-14 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
              Ready to make scroll-stopping content?
            </h2>
            <p className="mt-3 text-sm text-neutral-600">
              Brief {firstName} in minutes, pay securely through GoCollab, and
              get ad-ready videos delivered on time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBookClick}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: BRAND_RED }}
          >
            <Zap className="size-4 fill-white" strokeWidth={0} />
            Place order with {firstName}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-neutral-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} GoCollab · This public profile is
            shared by the creator. Bookings & payments are handled securely on
            GoCollab.
          </p>
          <nav className="flex items-center gap-5">
            <Link href="/" className="hover:text-neutral-900">
              Browse creators
            </Link>
            <Link href="/register/brand" className="hover:text-neutral-900">
              For brands
            </Link>
            <Link href="/register/creator" className="hover:text-neutral-900">
              Become a creator
            </Link>
          </nav>
        </div>
      </footer>

    </div>
  );
}

/* ----------------------------- Sub-components ----------------------------- */

function VerifiedBadge() {
  return (
    <span
      title="Verified creator"
      className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
    >
      <Check className="size-3.5" strokeWidth={3.5} />
    </span>
  );
}

function AvatarCard({
  imageUrl,
  initials,
  isTopCreator,
}: {
  imageUrl: string | null;
  initials: string;
  isTopCreator: boolean;
}) {
  return (
    <div className="relative shrink-0">
      <div className="relative size-40 overflow-hidden rounded-3xl border border-neutral-200 bg-neutral-100 shadow-sm sm:size-44">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-rose-400 to-pink-500 font-display text-4xl font-bold text-white">
            {initials}
          </div>
        )}
      </div>
      {isTopCreator && (
        <span className="absolute -left-2 -top-2 inline-flex items-center gap-1 rounded-md bg-lime-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-900 shadow-sm">
          Top creator
        </span>
      )}
      <span className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-4 ring-white">
        <Check className="size-3.5" strokeWidth={3} />
      </span>
    </div>
  );
}

function IntroReel({
  src,
  poster,
  label = "Intro reel",
}: {
  src: string | null;
  poster: string | null;
  label?: string;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!src) {
    return (
      <div className="flex aspect-[9/16] w-full items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 text-sm text-neutral-400">
        No intro reel yet
      </div>
    );
  }

  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-neutral-200 bg-black shadow-sm">
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        className="size-full object-cover"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) =>
          setDuration((e.currentTarget.duration as number) || null)
        }
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
      />

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "absolute inset-0 z-10 flex items-center justify-center transition",
          playing ? "bg-transparent hover:bg-black/10" : "bg-black/20",
        )}
        aria-label={playing ? "Pause intro" : "Play intro"}
      >
        {!playing && (
          <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-lg">
            <Play className="size-6 fill-neutral-900" strokeWidth={0} />
          </span>
        )}
      </button>

      <span className="pointer-events-none absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2 py-1 text-[10px] font-semibold text-neutral-800 shadow-sm">
        <Play className="size-2.5 fill-neutral-800" strokeWidth={0} />
        {label}
      </span>

      {duration != null && (
        <span className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-md bg-black/65 px-2 py-0.5 text-[11px] font-medium text-white">
          {playing ? fmt(current) : fmt(duration)}
        </span>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  trailing,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  trailing?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          className="flex size-7 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: BRAND_RED }}
        >
          <Icon className="size-3.5" strokeWidth={2.5} />
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight text-neutral-900">
          {title}
        </h2>
      </div>
      {trailing && (
        <p className="text-xs font-medium text-neutral-500">{trailing}</p>
      )}
    </div>
  );
}

function PortfolioTile({
  video,
  isPlayingElsewhere,
  onPlay,
  onStop,
}: {
  video: PortfolioVideoApi;
  isPlayingElsewhere: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState<string | null>(null);

  // Stop this tile when another starts playing
  useEffect(() => {
    if (isPlayingElsewhere) {
      const v = ref.current;
      if (v && !v.paused) {
        v.pause();
        v.currentTime = 0;
      }
    }
  }, [isPlayingElsewhere]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      onPlay();
      void v.play();
    } else {
      v.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className="group relative aspect-[9/16] overflow-hidden rounded-xl bg-neutral-900 shadow-sm ring-1 ring-neutral-200 transition hover:shadow-md">
      <video
        ref={ref}
        src={video.videoUrl}
        poster={video.thumbnailUrl ?? undefined}
        className="size-full object-cover"
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); onStop(); }}
        onEnded={() => { setPlaying(false); onStop(); }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) {
            const m = Math.floor(d / 60);
            const s = Math.floor(d % 60);
            setDuration(`${m}:${s.toString().padStart(2, "0")}`);
          }
        }}
      />

      {/* Duration badge */}
      {duration && (
        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <Play className="size-2.5 fill-white" strokeWidth={0} />
          {duration}
        </span>
      )}

      {/* Controls overlay — always visible on hover, or when playing */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center transition-opacity",
          playing
            ? "opacity-0 hover:opacity-100"
            : "opacity-0 group-hover:opacity-100",
        )}
      >
        <button
          type="button"
          onClick={togglePlay}
          className="flex size-12 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-lg transition hover:bg-white"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing
            ? <Pause className="size-5 fill-neutral-900" strokeWidth={0} />
            : <Play className="size-5 fill-neutral-900" strokeWidth={0} />
          }
        </button>
      </div>

      {/* Bottom controls: mute + label */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-3">
        {video.industryLabel ? (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/90">
            {video.industryLabel}
          </p>
        ) : <span />}
        {playing && (
          <button
            type="button"
            onClick={toggleMute}
            className="flex size-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted
              ? <VolumeX className="size-3.5" />
              : <Volume2 className="size-3.5" />
            }
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  review,
}: {
  review: {
    id: string;
    rating: number;
    review?: string | null;
    packageNameSnapshot?: string | null;
    createdAt: string;
    brand: { brandName: string; logoUrl?: string | null };
  };
}) {
  const brandName = review.brand?.brandName ?? "Brand";
  const initial = brandName.charAt(0).toUpperCase();
  const date = review.createdAt
    ? timeAgo(new Date(review.createdAt))
    : "";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
            {initial}
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {brandName}
            </p>
            <p className="text-xs text-neutral-500">{date}</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={cn(
                "size-3.5",
                i <= review.rating
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-neutral-300",
              )}
            />
          ))}
        </div>
      </div>
      {review.review && (
        <p className="mt-3 text-sm leading-relaxed text-neutral-700">
          {review.review}
        </p>
      )}
      {review.packageNameSnapshot && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
          <CheckCircle2 className="size-3" /> Ordered ·{" "}
          {review.packageNameSnapshot}
        </p>
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const days = Math.floor(seconds / 86400);
  if (days < 1) return "today";
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

interface PricingCardProps {
  packages: NonNullable<CreatorProfileItemApi["packages"]>;
  selectedPackage: NonNullable<CreatorProfileItemApi["packages"]>[number];
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
  addOns: NonNullable<CreatorProfileItemApi["addOns"]>;
  selectedAddOns: Set<string>;
  onToggleAddOn: (id: string) => void;
  totalPrice: number;
  onBook: () => void;
}

function PricingCard({
  packages,
  selectedPackage,
  selectedPackageId,
  onSelectPackage,
  addOns,
  selectedAddOns,
  onToggleAddOn,
  totalPrice,
  onBook,
}: PricingCardProps) {
  const basePrice = toNumber(selectedPackage.priceAmount);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-rose-50 to-white px-5 pb-5 pt-5">
        {packages.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {packages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPackage(p.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  p.id === selectedPackageId
                    ? "bg-neutral-900 text-white"
                    : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:ring-neutral-300",
                )}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        <p className="text-sm font-semibold text-neutral-700">
          {selectedPackage.name}
        </p>
        <p className="mt-1 font-display text-3xl font-bold tracking-tight text-neutral-900">
          {formatINR(basePrice)}
          <span className="ml-1 text-sm font-medium text-neutral-500">
            base
          </span>
        </p>

        {selectedPackage.deliverables?.[0] && (
          <p className="mt-2 text-sm text-neutral-600">
            {selectedPackage.deliverables[0]}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          <PriceChip
            icon={Clock}
            label={`${selectedPackage.deliveryDays}d delivery`}
          />
          {selectedPackage.videoLengthSeconds ? (
            <PriceChip
              icon={Film}
              label={`${selectedPackage.videoLengthSeconds}s video`}
            />
          ) : null}
          <PriceChip
            icon={RefreshCw}
            label={`${selectedPackage.maxRevisions} revision${selectedPackage.maxRevisions === 1 ? "" : "s"}`}
          />
        </div>
      </div>

      <div className="border-t border-neutral-200 px-5 py-4">
        <ul className="space-y-2 text-sm">
          {(selectedPackage.deliverables ?? []).slice(0, 6).map((d) => (
            <li
              key={d}
              className="flex items-start gap-2 text-neutral-700"
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-rose-500"
                strokeWidth={3}
              />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>

      {addOns.length > 0 && (
        <div className="border-t border-neutral-200 bg-neutral-50/50 px-5 py-4">
          <p className="text-xs font-semibold text-neutral-500">
            Add-ons{" "}
            <span className="font-normal text-neutral-400">
              · optional · tap to add
            </span>
          </p>
          <ul className="mt-3 space-y-2">
            {addOns.map((a) => {
              const checked = selectedAddOns.has(a.id);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onToggleAddOn(a.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition",
                      checked
                        ? "border-rose-300 ring-1 ring-rose-200"
                        : "border-neutral-200 hover:border-neutral-300",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-rose-500 bg-rose-500 text-white"
                          : "border-neutral-300 bg-white",
                      )}
                    >
                      {checked && (
                        <Check className="size-3" strokeWidth={3.5} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-neutral-900">
                        {a.name}
                      </p>
                      {a.description && (
                        <p className="mt-0.5 text-xs leading-snug text-neutral-500">
                          {a.description}
                        </p>
                      )}
                      {a.deliveryDays != null && (
                        <p className="mt-0.5 text-xs font-medium text-rose-600">
                          Delivery in {a.deliveryDays} day
                          {a.deliveryDays === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-neutral-900">
                      +{formatINR(toNumber(a.priceAmount))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="border-t border-neutral-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-600">Total</p>
          <p className="font-display text-lg font-bold text-neutral-900">
            {formatINR(totalPrice)}
          </p>
        </div>
        <button
          type="button"
          onClick={onBook}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          style={{ backgroundColor: BRAND_RED }}
        >
          <Zap className="size-4 fill-white" strokeWidth={0} />
          Place order · {formatINR(totalPrice)}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
          <ShieldCheck className="size-3" />
          Secure checkout on{" "}
          <strong className="text-neutral-700">GoCollab</strong> ·
          escrow-protected
        </p>
      </div>
    </div>
  );
}

function PriceChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200">
      <Icon className="size-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}

