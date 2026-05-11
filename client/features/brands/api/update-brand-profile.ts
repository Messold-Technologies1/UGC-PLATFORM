import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { BrandCategoryApi, BrandProductTypeApi } from "./brand-category-types";
import type { BrandProfileItemApi } from "./types";

export type UpdateBrandProfilePayload = {
  brandName?: string;
  contactFullName?: string;
  contactEmail?: string;
  contactPhone?: string;
  brandPronunciation?: string | null;
  brandPronunciationAudioKey?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  productType?: BrandProductTypeApi | null;
  categories?: BrandCategoryApi[];
  otherCategoryLabel?: string | null;
  logoKey?: string | null;
};

export async function updateBrandProfile(
  payload: UpdateBrandProfilePayload,
): Promise<BrandProfileItemApi> {
  const { data } = await api.patch<BrandProfileItemApi>(
    ENDPOINTS.BRANDS.PROFILE,
    payload,
  );
  return data;
}

