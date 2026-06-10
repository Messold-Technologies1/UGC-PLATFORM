import {
  Country,
  State,
  type ICountry,
  type IState,
} from "country-state-city";

import type { AuthUser } from "@/providers/auth-provider";
import type {
  CreatorContentVolumeBucket,
  CreatorGender,
  CreatorLanguageFluency,
} from "@/features/creators/api/create-creator-profile";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";
import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";


export const MAX_INTRO_VIDEO_BYTES = 200 * 1024 * 1024;
export const INTRO_VIDEO_ACCEPT =
  "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
export const INTRO_VIDEO_CONTENT_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

export const SELECT_NONE = "__none__";
export const PACKAGE_NAME = "Standard";
export const PACKAGE_DELIVERY_DAYS = 5;
export const PACKAGE_DEFAULT_MAX_REVISIONS = 2;
export const PACKAGE_MAX_REVISIONS = 10;
export const PACKAGE_MIN_DELIVERY_DAYS = 1;
export const PACKAGE_MAX_DELIVERY_DAYS = 30;
export const PACKAGE_VIDEO_LENGTH_SECONDS = 60;
export const PACKAGE_MAX_VIDEO_LENGTH_SECONDS = 60;
export const PACKAGE_PRICE_STEP = 500;
export const PLATFORM_FEE_RATE = 0.2;

export type OrderEarningsPreview = {
  packagePrice: number;
  addOnsTotal: number;
  orderTotal: number;
  platformFee: number;
  creatorEarnings: number;
};

export function calculateOrderEarningsPreview(params: {
  packagePriceAmount: string;
  selectedAddOnPrices: string[];
}): OrderEarningsPreview | null {
  const packageTrimmed = params.packagePriceAmount.trim();
  if (!packageTrimmed) return null;

  const packagePrice = Number(packageTrimmed);
  if (!Number.isFinite(packagePrice) || packagePrice <= 0) return null;

  let addOnsTotal = 0;
  for (const price of params.selectedAddOnPrices) {
    const trimmed = price.trim();
    if (!trimmed) continue;
    const amount = Number(trimmed);
    if (Number.isFinite(amount) && amount > 0) {
      addOnsTotal += amount;
    }
  }

  const orderTotal = packagePrice + addOnsTotal;
  const platformFee = Math.round(orderTotal * PLATFORM_FEE_RATE);
  const creatorEarnings = orderTotal - platformFee;

  return {
    packagePrice,
    addOnsTotal,
    orderTotal,
    platformFee,
    creatorEarnings,
  };
}


export const facetSections: Array<{
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  label: string;
}> = [
  { dimension: "CONTENT_FORMAT", label: "Content format" },
  { dimension: "APPEARANCE", label: "Appearance" },
  { dimension: "CONTENT_STYLE", label: "Content style" },
  { dimension: "CAPABILITY", label: "Capabilities" },
  { dimension: "LIFE_STYLE", label: "Lifestyle" },
  { dimension: "CONTENT_CATEGORY", label: "Content category" },
  { dimension: "CATEGORY_EXPERIENCE", label: "Category experience" },
  { dimension: "OCCUPATION", label: "Occupation" },
  { dimension: "CAN_CREATE_WITH", label: "Can create with" },
  { dimension: "AI_CONTENT_PERMISSION", label: "AI content permission" },
];

export const genderOptions: Array<{ value: CreatorGender; label: string }> = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-binary" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
  { value: "OTHER", label: "Other" },
];

export const contentVolumeOptions: Array<{
  value: CreatorContentVolumeBucket;
  label: string;
}> = [
  { value: "NONE", label: "0" },
  { value: "RANGE_1_5", label: "1-5" },
  { value: "RANGE_5_15", label: "5-15" },
  { value: "RANGE_15_25", label: "15-25" },
  { value: "RANGE_25_50", label: "25-50" },
  { value: "RANGE_50_PLUS", label: "50+" },
];

export const fluencyOptions: Array<{
  value: CreatorLanguageFluency;
  label: string;
}> = [
  { value: "NATIVE", label: "Native" },
  { value: "FLUENT", label: "Fluent" },
  { value: "CONVERSATIONAL", label: "Conversational" },
];


export type SelectedFacets = Partial<
  Record<Exclude<CreatorFacetDimension, "LANGUAGE">, string[]>
>;

export type LanguageDraft = {
  slug: string;
  fluency: CreatorLanguageFluency;
};

export type PackageDraft = {
  packageName: string;
  videoLengthSeconds: string;
  priceAmount: string;
  deliveryDays: string;
  maxRevisions: string;
  basicEditing: boolean;
};

export type AddOnDraft = {
  priceAmount: string;
  description: string;
};


export function getInitialCreatorName(user: AuthUser | null): string {
  return user?.name?.trim() || user?.email?.split("@")[0] || "";
}

export function getInitialCreatorIntroVideoPreviewUrl(
  initialProfile?: CreatorProfileItemApi | null,
): string | null {
  const url = initialProfile?.introVideoUrl?.trim();
  if (!url) return null;
  return url.startsWith("http://") || url.startsWith("https://") ? url : null;
}

export function getIntroVideoContentType(file: File): string | null {
  const contentType = file.type.toLowerCase();
  if (INTRO_VIDEO_CONTENT_TYPES.has(contentType)) {
    return contentType;
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "webm") return "video/webm";
  return null;
}

export function normalizeWholeNumberInput(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeOptionalUrl(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function createInitialSelectedFacets(
  initialProfile?: CreatorProfileItemApi | null,
): SelectedFacets {
  const out: SelectedFacets = {};
  for (const row of initialProfile?.facetSelections ?? []) {
    if (row.dimension === "LANGUAGE") continue;
    const dimension = row.dimension as Exclude<CreatorFacetDimension, "LANGUAGE">;
    out[dimension] = [...(out[dimension] ?? []), row.slug];
  }
  return out;
}

export function createInitialLanguageDrafts(
  initialProfile?: CreatorProfileItemApi | null,
): LanguageDraft[] {
  const existing = (initialProfile?.profileLanguages ?? []).map((row) => ({
    slug: row.slug,
    fluency: row.fluency,
  }));
  if (existing.length === 0) {
    return [
      { slug: "", fluency: "NATIVE" },
      { slug: "", fluency: "FLUENT" },
    ];
  }
  return existing;
}

export function createInitialPackageDraft(
  initialProfile?: CreatorProfileItemApi | null,
): PackageDraft {
  const pkg = initialProfile?.packages?.[0];
  return {
    packageName: pkg?.name ?? PACKAGE_NAME,
    videoLengthSeconds:
      pkg?.videoLengthSeconds != null
        ? String(pkg.videoLengthSeconds)
        : String(PACKAGE_VIDEO_LENGTH_SECONDS),
    priceAmount: pkg?.priceAmount
      ? String(Math.round(Number(pkg.priceAmount)))
      : "",
    deliveryDays:
      pkg?.deliveryDays != null
        ? String(pkg.deliveryDays)
        : String(PACKAGE_DELIVERY_DAYS),
    maxRevisions: String(PACKAGE_DEFAULT_MAX_REVISIONS),
    basicEditing: pkg?.deliverables?.includes("Basic editing") ?? false,
  };
}

export function findCountryByName(
  name: string | null | undefined,
): ICountry | null {
  const target = name?.trim().toLowerCase();
  if (!target) return null;
  return (
    Country.getAllCountries().find(
      (country) => country.name.trim().toLowerCase() === target,
    ) ?? null
  );
}

export function findStateByName(
  countryCode: string,
  name: string | null | undefined,
): IState | null {
  const target = name?.trim().toLowerCase();
  if (!countryCode || !target) return null;
  return (
    State.getStatesOfCountry(countryCode).find(
      (state) => state.name.trim().toLowerCase() === target,
    ) ?? null
  );
}

import type { CreatorAddOnOption } from "@/features/creators/api/get-creator-add-on-options";

export function addOnPriceError(
  option: CreatorAddOnOption,
  priceAmount: string,
): string | null {
  const price = Number(priceAmount);
  if (!/^\d+$/.test(priceAmount) || !Number.isInteger(price)) {
    return `${option.name} price must be a whole number.`;
  }
  if (option.fixedPrice != null) {
    return price === option.fixedPrice
      ? null
      : `${option.name} price must be exactly ₹${option.fixedPrice}.`;
  }
  const min = option.minPrice ?? 0;
  const step = option.stepPrice ?? 1;
  if (price < min || price % step !== 0) {
    return `${option.name} price must be >= ₹${min} and in steps of ₹${step}.`;
  }
  return null;
}
