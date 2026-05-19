import type { Creator, CreatorProfile, Package } from "../types";
import type { CreatorProfileItemApi, CreatorPublicListItemApi } from "./types";

type ListingProfileApi = CreatorProfileItemApi | CreatorPublicListItemApi;

function trimString(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimStringArray(
  values: Array<string | null | undefined> | null | undefined,
): string[] {
  if (!values?.length) return [];
  return values.map((value) => trimString(value)).filter(Boolean);
}

function isCreatorProfileItemApi(
  profile: ListingProfileApi,
): profile is CreatorProfileItemApi {
  return "displayName" in profile;
}

function getProfileName(profile: ListingProfileApi): string {
  return isCreatorProfileItemApi(profile) ? profile.displayName : profile.name;
}

function getProfileLanguages(profile: ListingProfileApi): string[] {
  if (isCreatorProfileItemApi(profile)) {
    return trimStringArray(
      (profile.profileLanguages ?? []).map((item) => item?.label),
    );
  }
  return trimStringArray(profile.languages);
}

function getProfileCategories(profile: ListingProfileApi): string[] {
  if (isCreatorProfileItemApi(profile)) {
    return trimStringArray(
      (profile.categories ?? []).map((item) => item?.category),
    );
  }
  return trimStringArray(profile.categories);
}

function getProfilePersonaTags(profile: ListingProfileApi): string[] {
  if (isCreatorProfileItemApi(profile)) {
    return trimStringArray(
      (profile.personaTags ?? []).map((item) => item?.tag),
    );
  }
  return trimStringArray(profile.personaTags);
}

function getFirstPortfolioVideo(profile: ListingProfileApi) {
  return isCreatorProfileItemApi(profile)
    ? (profile.firstPortfolioVideo ?? null)
    : (profile.portfolioVideos?.[0] ?? null);
}

function getTravelRadius(profile: ListingProfileApi): number | null {
  return isCreatorProfileItemApi(profile)
    ? (profile.travelRadius ?? null)
    : null;
}

function normalizeGender(
  raw: string | null | undefined,
): "male" | "female" | "other" {
  const g = (raw ?? "").toLowerCase();
  if (g === "male" || g === "female") return g;
  return "other";
}

function minPackagePrice(
  packages: Array<{ priceAmount: string }> | undefined,
): number {
  if (!packages?.length) return 0;
  let min: number | null = null;
  for (const p of packages) {
    const n = Number.parseFloat(p.priceAmount);
    if (Number.isNaN(n)) continue;
    min = min === null || n < min ? n : min;
  }
  return min ?? 0;
}

function parseRating(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const rating = Number.parseFloat(value);
  return Number.isFinite(rating) ? rating : 0;
}

function buildTags(profile: ListingProfileApi): string[] {
  const fromCategories = getProfileCategories(profile);
  const fromPersona = getProfilePersonaTags(profile);
  const firstPortfolioVideo = getFirstPortfolioVideo(profile);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [
    ...fromCategories,
    ...fromPersona,
    ...trimStringArray(firstPortfolioVideo?.tags),
  ]) {
    const key = t.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 6) break;
  }
  return out;
}

export function mapProfileToListingCreator(
  profile: ListingProfileApi,
): Creator {
  const categoryNames = getProfileCategories(profile);
  const category = categoryNames[0] ?? "General";
  const categories = categoryNames.length > 0 ? categoryNames : [category];
  const travelRadius = getTravelRadius(profile);

  const thumb = trimString(profile.profileImageUrl);
  const thumbnail =
    thumb && (thumb.startsWith("http://") || thumb.startsWith("https://"))
      ? thumb
      : "/globe.svg";
  const firstPortfolioVideo = getFirstPortfolioVideo(profile);
  const introVideoUrl = trimString(profile.introVideoUrl);
  const previewVideoUrl =
    introVideoUrl || trimString(firstPortfolioVideo?.videoUrl) || null;
  const previewVideoThumbnail =
    trimString(firstPortfolioVideo?.thumbnailUrl) || thumbnail;
  const industryLabel =
    trimString(firstPortfolioVideo?.industryLabel) || undefined;

  return {
    id: profile.id,
    name: getProfileName(profile),
    location: trimString(profile.city) || "Location not set",
    rating: parseRating(profile.avgRating),
    reviewCount: profile.reviewCount ?? 0,
    startingPrice: Math.round(minPackagePrice(profile.packages)),
    ordersCompleted: profile.collaborationCount ?? 0,
    thumbnail,
    previewVideoUrl,
    introVideoUrl: introVideoUrl || null,
    previewVideoThumbnail,
    tags: buildTags(profile),
    available: true,
    storeVisit: profile.onLocationAvailable ?? false,
    travelAvailable:
      (travelRadius != null && travelRadius > 0) ||
      (profile.onLocationAvailable ?? false),
    gender: normalizeGender(profile.gender),
    category,
    categories,
    industryLabel,
    languages: getProfileLanguages(profile),
    deliveryDays:
      (profile.packages?.[0] as { deliveryDays?: number } | undefined)
        ?.deliveryDays ?? 5,
    basicEditing: (() => {
      const firstPkg = profile.packages?.[0] as
        | {
            basicEditing?: boolean;
            deliverables?: string[];
          }
        | undefined;
      if (!firstPkg) return true;
      if (typeof firstPkg.basicEditing === "boolean") return firstPkg.basicEditing;
      if (Array.isArray(firstPkg.deliverables)) {
        return firstPkg.deliverables.includes("Basic editing");
      }
      return true;
    })(),
  };
}

const PACKAGE_TIERS: Package["tier"][] = ["basic", "standard", "premium"];

function mapApiPackages(
  packages: CreatorProfileItemApi["packages"] | undefined,
): Package[] {
  if (!packages?.length) return [];
  const sorted = [...packages].sort(
    (a, b) =>
      Number.parseFloat(a.priceAmount) - Number.parseFloat(b.priceAmount),
  );
  return sorted.map((p, index) => ({
    id: p.id,
    tier: PACKAGE_TIERS[Math.min(index, PACKAGE_TIERS.length - 1)]!,
    label: p.name,
    price: Math.round(Number.parseFloat(p.priceAmount)) || 0,
    deliveryDays: p.deliveryDays,
    revisions: p.maxRevisions,
    features:
      p.deliverables.length > 0 ? p.deliverables : ["See package details"],
  }));
}

function mapApiAddOns(
  addOns: CreatorProfileItemApi["addOns"] | undefined,
): CreatorProfile["addOns"] {
  if (!addOns?.length) return [];
  return addOns.map((addOn) => ({
    id: addOn.id,
    label: addOn.name,
    price: Math.round(Number.parseFloat(addOn.priceAmount)) || 0,
    description: addOn.description ?? null,
  }));
}

export function mapProfileItemToCreatorProfile(
  profile: CreatorProfileItemApi,
): CreatorProfile {
  const base = mapProfileToListingCreator(profile);
  return {
    ...base,
    bio: profile.bio?.trim() || "No bio yet.",
    languages: getProfileLanguages(profile),
    personaTags: (profile.personaTags ?? []).map((t) => t.tag),
    restrictions: (profile.restrictions ?? []).map((r) => r.restriction),
    travelRadiusKm:
      profile.travelRadius != null && !Number.isNaN(profile.travelRadius)
        ? profile.travelRadius
        : null,
    facetSelections: profile.facetSelections ?? [],
    packages: mapApiPackages(profile.packages),
    addOns: mapApiAddOns(profile.addOns),
    reviews: [],
  };
}
