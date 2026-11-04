"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Tag,
  Users,
  User,
  Briefcase,
  Globe,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { usePublicAuthUser } from "@/features/auth/hooks/use-me-query";
import { usePublicPortfolioVideosQuery } from "@/features/creator-portfolio/hooks/use-public-portfolio-videos-query";
import type { PortfolioVideoApi } from "@/features/creator-portfolio/api/types";
import { useCreatorRatingReviewsQuery } from "../../../hooks/use-creator-rating-reviews-query";
import { usePublicInstagramInsightsQuery } from "../../../hooks/use-public-instagram-insights";
import { formatContentPreferenceLabel } from "../../../lib/format-content-preference-label";
import type { CreatorProfileItemApi } from "../../../api/types";
import type { DemographicBucketApi } from "../../../api/social-connections";
import type {
  AudienceBucket,
  PublicProfileAddOn,
  PublicProfileAudience,
  PublicProfileFact,
  PublicProfileMedia,
  PublicProfilePackage,
  PublicProfileReviews,
  PublicProfileViewModel,
} from "./types";

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** "₹3,000" — matches the designs' Indian-grouping currency format. */
export function formatINR(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/** 4132 -> "4.1K". Mirrors the follower/reach counts in the designs. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < 1000) return String(Math.round(value));
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Normalise an API demographic bucket list into percentage shares.
 *
 * The API may send either absolute counts or a precomputed `share`; the
 * designs always draw percentages, so derive one when it is missing.
 */
function toBuckets(rows: DemographicBucketApi[] | undefined): AudienceBucket[] {
  const list = rows ?? [];
  const total = list.reduce((sum, row) => sum + (row.value || 0), 0);
  return list
    .map((row) => ({
      key: row.key,
      value: row.value,
      share:
        typeof row.share === "number"
          ? Math.round(row.share)
          : total > 0
            ? Math.round((row.value / total) * 100)
            : 0,
    }))
    .filter((row) => row.share > 0 || row.value > 0);
}

export type UsePublicProfileViewModelInput = {
  profile: CreatorProfileItemApi;
  initialPortfolioVideos?: PortfolioVideoApi[];
};

/**
 * Single source of data for every public-page template.
 *
 * Templates receive the returned model and render it; none of them re-derive
 * labels, totals or groupings. Adding a template is therefore a presentation
 * change only.
 */
export function usePublicProfileViewModel({
  profile,
  initialPortfolioVideos,
}: UsePublicProfileViewModelInput): PublicProfileViewModel {
  const router = useRouter();

  // Re-fetch auth on mount so a visitor who just logged in is routed to
  // checkout rather than registration without needing a reload.
  const { data: meUser } = usePublicAuthUser();
  const isAgency = meUser?.roles?.includes("AGENCY") ?? false;
  const isBrand = meUser?.roles?.includes("BRAND") ?? false;
  const isBuyer = isBrand || isAgency;

  const book = useCallback(() => {
    if (isAgency) {
      router.push(`/agency/creators?creatorId=${profile.id}`);
      return;
    }
    if (isBrand) {
      router.push(`/brand/creators?creatorId=${profile.id}`);
      return;
    }
    router.push("/register");
  }, [isAgency, isBrand, profile.id, router]);

  // ---------------------------------------------------------------- identity

  const facetsByDimension = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const facet of profile.facetSelections ?? []) {
      (groups[facet.dimension] ||= []).push(
        facet.customLabel?.trim() || facet.label,
      );
    }
    return groups;
  }, [profile.facetSelections]);

  const categories = facetsByDimension.CONTENT_CATEGORY ?? [];
  const creatorTypeLabel = facetsByDimension.CREATOR_TYPE?.[0] ?? null;

  // Creators are anonymous to brands: the public page shows a niche-derived
  // headline and never `displayName`.
  const headline = categories[0] ? `${categories[0]} Creator` : "UGC Creator";
  const headlineWords = headline.split(" ");
  const headlineTail = headlineWords[headlineWords.length - 1];
  const headlineLead = headlineWords.slice(0, -1).join(" ");

  const initials =
    headline
      .split(/[\s/]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "GC";

  const locationLabel = useMemo(() => {
    const parts = [profile.city, profile.stateName, profile.countryName].filter(
      Boolean,
    );
    return parts.length > 0 ? parts.join(", ") : null;
  }, [profile.city, profile.countryName, profile.stateName]);

  const languages = useMemo(
    () => (profile.profileLanguages ?? []).map((row) => row.label),
    [profile.profileLanguages],
  );

  const openTo = useMemo(
    () =>
      (profile.restrictions ?? [])
        .map((row) => row.restriction)
        .filter((value): value is string => Boolean(value))
        .map(formatContentPreferenceLabel),
    [profile.restrictions],
  );

  const facts = useMemo<PublicProfileFact[]>(() => {
    const rows: PublicProfileFact[] = [];
    const push = (
      key: PublicProfileFact["key"],
      label: string,
      values: string[],
      icon: PublicProfileFact["icon"],
    ) => {
      if (values.length > 0) rows.push({ key, label, values, icon });
    };

    push("CONTENT_CATEGORY", "Content category", categories, Tag);
    push(
      "CREATOR_TYPE",
      "Creator type",
      facetsByDimension.CREATOR_TYPE ?? [],
      Users,
    );
    push("APPEARANCE", "Appearance", facetsByDimension.APPEARANCE ?? [], User);
    push("OCCUPATION", "Occupation", facetsByDimension.OCCUPATION ?? [], Briefcase);
    push("LANGUAGE", "Languages", languages, Globe);

    rows.push({
      key: "ON_LOCATION",
      label: "On-location shoot",
      values: [profile.onLocationAvailable ? "Available" : "Not available"],
      icon: MapPinned,
      available: Boolean(profile.onLocationAvailable),
    });

    push("WORKED_WITH", "Worked with", profile.highlights ?? [], Sparkles);

    return rows;
  }, [
    categories,
    facetsByDimension,
    languages,
    profile.highlights,
    profile.onLocationAvailable,
  ]);

  // ------------------------------------------------------------------- media

  const portfolioQuery = usePublicPortfolioVideosQuery(profile.id, {
    initialData: initialPortfolioVideos,
  });

  const { media, intro, portfolio } = useMemo(() => {
    const playable = (portfolioQuery.data ?? []).filter((row) => row.videoUrl);

    const introMedia: PublicProfileMedia | null = profile.introVideoUrl
      ? {
          id: "intro",
          videoUrl: profile.introVideoUrl,
          thumbnailUrl:
            playable.find((row) => row.videoUrl === profile.introVideoUrl)
              ?.thumbnailUrl ??
            profile.profileImageUrl ??
            null,
          isIntro: true,
        }
      : null;

    const portfolioMedia: PublicProfileMedia[] = playable
      // The intro reel is surfaced separately; never show it twice.
      .filter((row) => row.videoUrl !== profile.introVideoUrl)
      .map((row) => ({
        id: row.id,
        videoUrl: row.videoUrl,
        thumbnailUrl: row.thumbnailUrl ?? null,
        isIntro: false,
      }));

    return {
      intro: introMedia,
      portfolio: portfolioMedia,
      media: introMedia ? [introMedia, ...portfolioMedia] : portfolioMedia,
    };
  }, [
    portfolioQuery.data,
    profile.introVideoUrl,
    profile.profileImageUrl,
  ]);

  const portfolioCountLabel = `${portfolio.length} ${
    portfolio.length === 1 ? "reel" : "reels"
  }`;

  // ---------------------------------------------------------------- pricing

  const packages = useMemo<PublicProfilePackage[]>(
    () =>
      (profile.packages ?? []).map((row) => {
        const price = toNumber(row.priceAmount);
        return {
          id: row.id ?? null,
          name: row.name,
          price,
          priceLabel: formatINR(price),
          deliverables: row.deliverables ?? [],
          deliveryLabel: `${row.deliveryDays} ${
            row.deliveryDays === 1 ? "day" : "days"
          }`,
          lengthLabel: `${row.videoLengthSeconds}s`,
          revisionsLabel: String(row.maxRevisions),
        };
      }),
    [profile.packages],
  );

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    () => profile.packages?.[0]?.id ?? null,
  );
  const selectedPackage =
    packages.find((row) => row.id === selectedPackageId) ?? packages[0] ?? null;

  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(
    () => new Set(),
  );

  const addOns = useMemo<PublicProfileAddOn[]>(
    () =>
      (profile.addOns ?? []).map((row) => {
        const price = toNumber(row.priceAmount);
        return {
          id: row.id,
          name: row.name,
          price,
          priceLabel: formatINR(price),
          selected: selectedAddOnIds.has(row.id),
        };
      }),
    [profile.addOns, selectedAddOnIds],
  );

  const toggleAddOn = useCallback((id: string) => {
    setSelectedAddOnIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectPackage = useCallback((id: string) => {
    setSelectedPackageId(id);
  }, []);

  const total =
    (selectedPackage?.price ?? 0) +
    addOns.reduce((sum, row) => (row.selected ? sum + row.price : sum), 0);

  // --------------------------------------------------------------- audience

  const { data: insights } = usePublicInstagramInsightsQuery(profile.id, {
    enabled: true,
  });

  const audience = useMemo<PublicProfileAudience | null>(() => {
    if (!insights?.connected) return null;
    const followers = insights.followers ?? 0;
    if (followers <= 0) return null;

    const ages = toBuckets(insights.ageRanges);
    const topAge =
      ages.length > 0
        ? ages.reduce((best, row) => (row.share > best.share ? row : best))
        : null;

    return {
      followersLabel: formatCompact(followers),
      reachLabel:
        typeof insights.reach === "number"
          ? formatCompact(insights.reach)
          : null,
      profileViewsLabel:
        typeof insights.profileViews === "number"
          ? formatCompact(insights.profileViews)
          : null,
      ages,
      gender: toBuckets(insights.gender),
      cities: toBuckets(insights.topCities),
      countries: toBuckets(insights.topCountries),
      topAge,
    };
  }, [insights]);

  // ---------------------------------------------------------------- reviews

  const reviewsQuery = useCreatorRatingReviewsQuery(profile.id, {
    page: 1,
    limit: 10,
  });

  const reviews = useMemo<PublicProfileReviews | null>(() => {
    const summary = reviewsQuery.data;
    const count = summary?.reviewCount ?? profile.reviewCount ?? 0;
    // Templates omit the reviews block entirely for creators without any.
    if (count <= 0) return null;

    const items = summary?.items ?? [];
    const histogram: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const row of items) {
      const bucket = Math.max(1, Math.min(5, Math.round(row.rating))) as
        | 1
        | 2
        | 3
        | 4
        | 5;
      histogram[bucket] += 1;
    }

    return {
      count,
      average:
        Number.parseFloat(summary?.avgRating ?? profile.avgRating ?? "0") || 0,
      histogram,
      items: items.map((row) => {
        const authorLabel = row.brand?.brandName ?? "Brand";
        return {
          id: row.id,
          rating: row.rating,
          comment: row.review ?? null,
          createdAt: row.createdAt,
          authorLabel,
          authorInitial: authorLabel.charAt(0).toUpperCase(),
          authorLogoUrl: row.brand?.logoUrl ?? null,
          packageLabel: row.packageNameSnapshot ?? null,
        };
      }),
    };
  }, [profile.avgRating, profile.reviewCount, reviewsQuery.data]);

  return {
    headline,
    headlineLead,
    headlineTail,
    initials,
    avatarUrl: profile.profileImageUrl ?? null,
    verified: profile.approvalStatus === "APPROVED",
    creatorTypeLabel,
    locationLabel,
    cityLabel: profile.city ?? null,
    bio: profile.bio ?? null,
    languages,
    languagesInline: languages.join(", "),
    categories,
    facts,
    openTo,
    media,
    intro,
    portfolio,
    portfolioCountLabel,
    packages,
    selectedPackage,
    selectPackage,
    addOns,
    toggleAddOn,
    total,
    totalLabel: formatINR(total),
    audience,
    reviews,
    book,
    isBuyer,
  };
}
