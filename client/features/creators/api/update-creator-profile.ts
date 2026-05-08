import api from "@/lib/api";
import { creatorsByIdPath } from "@/lib/endpoints";
import type {
  CreatorAddOnCreatePayload,
  CreatorContentVolumeBucket,
  CreatorFacetSelectionPayload,
  CreatorGender,
  CreatorPackageCreatePayload,
  CreatorProfileLanguagePayload,
} from "./create-creator-profile";
import type { CreatorProfileItemApi } from "./types";

export type UpdateCreatorProfilePayload = {
  displayName?: string;
  phone?: string;
  profileImageKey?: string;
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
  categories?: string[];
  personaTags?: string[];
  restrictions?: string[];
  packages?: CreatorPackageCreatePayload[];
  addOns?: CreatorAddOnCreatePayload[];
};

export async function updateCreatorProfile(
  profileId: string,
  payload: UpdateCreatorProfilePayload,
): Promise<CreatorProfileItemApi> {
  const { data } = await api.patch<CreatorProfileItemApi>(
    creatorsByIdPath(profileId),
    payload,
  );
  return data;
}
