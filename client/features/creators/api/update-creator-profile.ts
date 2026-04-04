import api from "@/lib/api";
import { creatorsByIdPath } from "@/lib/endpoints";
import type {
  CreatorAddOnCreatePayload,
  CreatorPackageCreatePayload,
} from "./create-creator-profile";
import type { CreatorProfileItemApi } from "./types";

export type UpdateCreatorProfilePayload = {
  displayName?: string;
  profileImageKey?: string;
  city?: string;
  bio?: string;
  gender?: string;
  travelRadius?: number;
  onLocationAvailable?: boolean;
  languages?: string[];
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
