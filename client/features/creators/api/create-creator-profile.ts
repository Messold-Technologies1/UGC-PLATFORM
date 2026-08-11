import type { CreatorFacetDimension } from "./get-creator-facet-options";

export type CreatorGender =
  | "FEMALE"
  | "MALE"
  | "NON_BINARY"
  | "PREFER_NOT_TO_SAY"
  | "OTHER";

export type CreatorContentVolumeBucket =
  | "NONE"
  | "RANGE_1_5"
  | "RANGE_5_15"
  | "RANGE_15_25"
  | "RANGE_25_50"
  | "RANGE_50_PLUS";

export type CreatorFacetSelectionPayload = {
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  slug: string;
};

export type CreatorProfileLanguagePayload = {
  slug: string;
};

export type CreatorPackageCreatePayload = {
  name: string;
  deliverables?: string[];
  videoLengthSeconds?: number;
  basicEditing?: boolean;
  priceAmount: string;
  deliveryDays?: number;
  maxRevisions: number;
};

export type CreatorAddOnCreatePayload = {
  slug: string;
  priceAmount: string;
  description?: string;
  /** Required for delivery-affecting add-ons (Faster Delivery). */
  deliveryDays?: number;
};

export type CreateCreatorProfilePayload = {
  displayName: string;
  contactEmail: string;
  profileImageKey?: string;
  introVideoKey?: string;
  countryName?: string;
  stateName?: string;
  city?: string;
  bio?: string;
  gender?: CreatorGender;
  dateOfBirth?: string;
  shippingAddress?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  snapchatUrl?: string;
  contentVolume?: CreatorContentVolumeBucket;
  collaborationCount?: number;
  travelRadius?: number;
  onLocationAvailable?: boolean;
  facetSelections?: CreatorFacetSelectionPayload[];
  profileLanguages?: CreatorProfileLanguagePayload[];
  packages?: CreatorPackageCreatePayload[];
  addOns?: CreatorAddOnCreatePayload[];
};

