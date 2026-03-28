import { isAxiosError } from "axios";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorProfileItemApi } from "./types";

export type CreatorPackageCreatePayload = {
  name: string;
  deliverables: string[];
  priceAmount: string;
  deliveryDays: number;
};

export type CreateCreatorProfilePayload = {
  displayName: string;
  /** Temp key from `POST .../uploads/presign` after successful PUT upload. */
  profileImageKey?: string;
  city?: string;
  bio?: string;
  gender?: string;
  travelRadius?: number;
  onLocationAvailable?: boolean;
  /** `IsNumberString` on server — e.g. `"499.00"`. */
  onLocationFee?: string;
  languages?: string[];
  categories?: string[];
  personaTags?: string[];
  restrictions?: string[];
  packages?: CreatorPackageCreatePayload[];
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
