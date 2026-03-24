import type { Creator, CreatorProfile, Package } from "../types";
import type { CreatorProfileItemApi } from "./types";

function normalizeGender(
  raw: string | null | undefined,
): "male" | "female" | "other" {
  const g = (raw ?? "").toLowerCase();
  if (g === "male" || g === "female") return g;
  return "other";
}

function minPackagePrice(packages: CreatorProfileItemApi["packages"]): number {
  let min: number | null = null;
  for (const p of packages) {
    const n = Number.parseFloat(p.priceAmount);
    if (Number.isNaN(n)) continue;
    min = min === null || n < min ? n : min;
  }
  return min ?? 0;
}

function buildTags(profile: CreatorProfileItemApi): string[] {
  const fromLang = profile.languages.map((l) => l.language);
  const fromServices = profile.services.map((s) => s.serviceType.name);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...fromLang, ...fromServices]) {
    const key = t.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 6) break;
  }
  return out;
}

export function mapProfileToListingCreator(
  profile: CreatorProfileItemApi,
): Creator {
  const category = profile.services[0]?.serviceType.name ?? "General";

  return {
    id: profile.id,
    name: profile.displayName,
    location: profile.city?.trim() || "Location not set",
    rating: 0,
    reviewCount: 0,
    startingPrice: Math.round(minPackagePrice(profile.packages)),
    ordersCompleted: 0,
    thumbnail: "/globe.svg",
    tags: buildTags(profile),
    available: true,
    storeVisit: false,
    travelAvailable: profile.travelRadius != null && profile.travelRadius > 0,
    gender: normalizeGender(profile.gender),
    category,
  };
}

const PACKAGE_TIERS: Package["tier"][] = ["basic", "standard", "premium"];

function mapApiPackages(
  packages: CreatorProfileItemApi["packages"],
): Package[] {
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
    revisions: 0,
    features:
      p.deliverables.length > 0 ? p.deliverables : ["See package details"],
  }));
}

export function mapProfileItemToCreatorProfile(
  profile: CreatorProfileItemApi,
): CreatorProfile {
  const base = mapProfileToListingCreator(profile);
  return {
    ...base,
    bio: profile.bio?.trim() || "No bio yet.",
    languages: profile.languages.map((l) => l.language),
    acceptsLingerie: false,
    responseTime: "Not specified",
    joinedDate: "—",
    portfolio: [],
    packages: mapApiPackages(profile.packages),
    addOns: [],
    reviews: [],
  };
}
