import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { CreatorsListResponse } from "./types";

export type CreatorListApiFilters = {
  page?: number;
  limit?: number;
  city?: string;
  gender?: string;
  industry?: string;
  portfolioTag?: string;
  onLocationAvailable?: boolean;
  minPrice?: string | number;
  maxPrice?: string | number;
  categories?: string[];
  personaTags?: string[];
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

  const city = filters.city?.trim();
  if (city) params.set("city", city);

  const gender = filters.gender?.trim();
  if (gender) params.set("gender", gender);

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

  for (const category of normalizeStringArray(filters.categories)) {
    params.append("categories", category);
  }
  for (const personaTag of normalizeStringArray(filters.personaTags)) {
    params.append("personaTags", personaTag);
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
): Promise<CreatorsListResponse> {
  const qs = serializeCreatorListApiParams({ ...filters, page, limit });
  const url = qs ? `${ENDPOINTS.CREATORS.LIST}?${qs}` : ENDPOINTS.CREATORS.LIST;
  const { data } = await api.get<CreatorsListResponse>(url);
  return data;
}
