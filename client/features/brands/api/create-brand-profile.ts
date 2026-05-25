import type { BrandCategoryApi, BrandProductTypeApi } from "./brand-category-types";

export type CreateBrandProfilePayload = {
  contactFullName: string;
  contactEmail: string;
  contactPhone: string;
  brandName: string;
  brandPronunciation?: string;
  brandPronunciationAudioKey?: string;
  logoKey?: string;
  website?: string;
  instagramUrl?: string;
  productType?: BrandProductTypeApi;
  categories?: BrandCategoryApi[];
  otherCategoryLabel?: string;
};
