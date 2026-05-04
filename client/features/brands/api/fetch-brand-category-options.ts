import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";

export type BrandCategoryOptionApi = {
  value: string;
  label: string;
};

export type BrandCategoryOptionsResponseApi = {
  items: BrandCategoryOptionApi[];
};

export const brandCategoryOptionsQueryKey = [
  "brands",
  "profile",
  "brand-category-options",
] as const;

export async function fetchBrandCategoryOptions(): Promise<
  BrandCategoryOptionsResponseApi["items"]
> {
  const { data } = await api.get<BrandCategoryOptionsResponseApi>(
    ENDPOINTS.BRANDS.PROFILE_BRAND_CATEGORY_OPTIONS,
  );
  return data.items;
}
