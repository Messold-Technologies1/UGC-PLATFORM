import type { Filters } from "../components/creator-filters";
import { DEFAULT_FILTERS } from "../components/creator-filters";

function normalizeMultiValue(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function parseMultiValue(
  sp: Pick<URLSearchParams, "get" | "getAll">,
  key: string,
): string[] {
  const fromAll = normalizeMultiValue(sp.getAll(key));
  if (fromAll.length > 0) return fromAll;

  const singleValue = sp.get(key)?.trim();
  if (!singleValue) return [];

  return normalizeMultiValue(singleValue.split(","));
}

function parseBoolean(
  sp: Pick<URLSearchParams, "get">,
  key: string,
  defaultValue = false,
): boolean {
  const value = sp.get(key)?.trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "true" || value === "1" || value === "yes";
}

export function parseBrowseListingParams(
  sp: Pick<URLSearchParams, "get" | "getAll">,
): { filters: Filters; search: string } {
  return {
    search: sp.get("q") ?? "",
    filters: {
      city: sp.get("city")?.trim() ?? DEFAULT_FILTERS.city,
      categories: parseMultiValue(sp, "categories"),
      gender: sp.get("gender")?.trim() ?? DEFAULT_FILTERS.gender,
      minPrice: sp.get("minPrice") ?? DEFAULT_FILTERS.minPrice,
      maxPrice: sp.get("maxPrice") ?? DEFAULT_FILTERS.maxPrice,
      onLocationAvailable: parseBoolean(
        sp,
        "onLocationAvailable",
        DEFAULT_FILTERS.onLocationAvailable,
      ),
      industry: sp.get("industry")?.trim() ?? DEFAULT_FILTERS.industry,
      portfolioTag:
        sp.get("portfolioTag")?.trim() ?? DEFAULT_FILTERS.portfolioTag,
      personaTags: parseMultiValue(sp, "personaTags"),
      restrictions: parseMultiValue(sp, "restrictions"),
    },
  };
}

export function serializeBrowseListingParams(
  filters: Filters,
  search: string,
): string {
  const params = new URLSearchParams();

  const query = search.trim();
  if (query) params.set("q", query);

  const city = filters.city.trim();
  if (city) params.set("city", city);

  for (const category of normalizeMultiValue(filters.categories)) {
    params.append("categories", category);
  }
  for (const personaTag of normalizeMultiValue(filters.personaTags)) {
    params.append("personaTags", personaTag);
  }
  for (const restriction of normalizeMultiValue(filters.restrictions)) {
    params.append("restrictions", restriction);
  }

  const gender = filters.gender.trim();
  if (gender) params.set("gender", gender);

  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.onLocationAvailable) params.set("onLocationAvailable", "true");

  const industry = filters.industry.trim();
  if (industry) params.set("industry", industry);

  const portfolioTag = filters.portfolioTag.trim();
  if (portfolioTag) params.set("portfolioTag", portfolioTag);

  return params.toString();
}
