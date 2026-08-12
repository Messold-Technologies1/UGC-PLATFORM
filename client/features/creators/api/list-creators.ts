import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorsListResponse } from "./types";

export type CreatorListApiFilters = {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  gender?: string;
  minAge?: number;
  maxAge?: number;
  ageGroup?: string;
  industry?: string;
  portfolioTag?: string;
  onLocationAvailable?: boolean;
  minPrice?: string | number;
  maxPrice?: string | number;
  maxDeliveryDays?: string | number;
  appearance?: string[];
  occupation?: string[];
  contentCategory?: string[];
  language?: string[];
  categories?: string[];
  restrictions?: string[];
};

function normalizeStringArray(values?: string[]): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

export function serializeCreatorListApiParams(
  filters: CreatorListApiFilters = {},
): string {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  const search = filters.search?.trim();
  if (search) params.set("search", search);

  const city = filters.city?.trim();
  if (city) params.set("city", city);

  const gender = filters.gender?.trim();
  if (gender) params.set("gender", gender);

  if (filters.minAge !== undefined) params.set("minAge", String(filters.minAge));
  if (filters.maxAge !== undefined) params.set("maxAge", String(filters.maxAge));

  const ageGroup = filters.ageGroup?.trim();
  if (ageGroup) params.set("ageGroup", ageGroup);

  const industry = filters.industry?.trim();
  if (industry) params.set("industry", industry);

  const portfolioTag = filters.portfolioTag?.trim();
  if (portfolioTag) params.set("portfolioTag", portfolioTag);

  if (filters.onLocationAvailable) {
    params.set("onLocationAvailable", "true");
  }

  if (filters.minPrice !== undefined && filters.minPrice !== "") {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined && filters.maxPrice !== "") {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.maxDeliveryDays !== undefined && filters.maxDeliveryDays !== "") {
    params.set("maxDeliveryDays", String(filters.maxDeliveryDays));
  }

  const facetArrayParams: Array<[string, string[] | undefined]> = [
    ["appearance", filters.appearance],
    ["occupation", filters.occupation],
    ["contentCategory", filters.contentCategory],
    ["language", filters.language],
  ];
  for (const [key, values] of facetArrayParams) {
    for (const value of normalizeStringArray(values)) {
      params.append(key, value);
    }
  }

  for (const category of normalizeStringArray(filters.categories)) {
    params.append("contentCategory", category);
  }
  for (const restriction of normalizeStringArray(filters.restrictions)) {
    params.append("restrictions", restriction);
  }

  return params.toString();
}

export async function fetchCreatorsPage(
  page: number,
  limit: number,
  filters: Omit<CreatorListApiFilters, "page" | "limit"> = {},
  signal?: AbortSignal,
): Promise<CreatorsListResponse> {
  const qs = serializeCreatorListApiParams({ ...filters, page, limit });
  const url = qs ? `${ENDPOINTS.CREATORS.LIST}?${qs}` : ENDPOINTS.CREATORS.LIST;
  const { data } = await api.get<CreatorsListResponse>(url, { signal });
  return data;
}
