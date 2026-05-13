import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorProfileItemApi } from "./types";
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

export type CreatorLanguageFluency =
  | "NATIVE"
  | "FLUENT"
  | "CONVERSATIONAL";

export type CreatorFacetSelectionPayload = {
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  slug: string;
};

export type CreatorProfileLanguagePayload = {
  slug: string;
  fluency: CreatorLanguageFluency;
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
};

export type CreateCreatorProfilePayload = {
  displayName: string;
  introVideoKey?: string;
  countryName?: string;
  stateName?: string;
  city?: string;
  bio?: string;
  gender?: CreatorGender;
  dateOfBirth?: string;
  shippingAddress?: string;
  instagramUrl?: string;
  contentVolume?: CreatorContentVolumeBucket;
  collaborationCount?: number;
  travelRadius?: number;
  onLocationAvailable?: boolean;
  facetSelections?: CreatorFacetSelectionPayload[];
  profileLanguages?: CreatorProfileLanguagePayload[];
  packages?: CreatorPackageCreatePayload[];
  addOns?: CreatorAddOnCreatePayload[];
};

export async function createCreatorProfile(
  payload: CreateCreatorProfilePayload,
): Promise<CreatorProfileItemApi> {
  const { data } = await api.post<CreatorProfileItemApi>(
    ENDPOINTS.CREATORS.PROFILE,
    payload,
  );
  return data;
}

export async function ensureCreatorProfile(
  payload: CreateCreatorProfilePayload,
): Promise<{ created: boolean; profile?: CreatorProfileItemApi }> {
  try {
    const profile = await createCreatorProfile(payload);
    return { created: true, profile };
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
      return { created: false };
    }
    throw err;
  }
}
