import type { BrandCategoryApi, BrandProductTypeApi } from "./brand-category-types";

export type BrandProfileItemApi = {
  id: string;
  userId: string;
  email: string;
  contactFullName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  brandName: string;
  brandPronunciation: string | null;
  brandPronunciationAudioKey: string | null;
  brandPronunciationAudioUrl: string | null;
  logoKey: string | null;
  logoUrl: string | null;
  website: string | null;
  instagramUrl: string | null;
  productType: BrandProductTypeApi | null;
  categories: BrandCategoryApi[];
  createdAt: string;
  updatedAt: string;
};
