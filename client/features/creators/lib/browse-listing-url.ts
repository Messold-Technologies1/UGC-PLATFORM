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
): { filters: Filters; search: string; page: number } {
  const pageStr = sp.get("page");
  const page = pageStr ? parseInt(pageStr, 10) : 1;
  return {
    search: sp.get("q") ?? "",
    page: isNaN(page) || page < 1 ? 1 : page,
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
      // Facet-based filters
      contentFormat: parseMultiValue(sp, "contentFormat"),
      appearance: parseMultiValue(sp, "appearance"),
      contentStyle: parseMultiValue(sp, "contentStyle"),
      capability: parseMultiValue(sp, "capability"),
      lifeStyle: parseMultiValue(sp, "lifeStyle"),
      occupation: parseMultiValue(sp, "occupation"),
      interest: parseMultiValue(sp, "interest"),
      categoryExperience: parseMultiValue(sp, "categoryExperience"),
      canCreateWith: parseMultiValue(sp, "canCreateWith"),
      language: parseMultiValue(sp, "language"),
      ageGroup: sp.get("ageGroup")?.trim() ?? DEFAULT_FILTERS.ageGroup,
    },
  };
}

/** All multi-value filter keys that get serialized with `append` */
const MULTI_VALUE_KEYS = [
  "categories",
  "personaTags",
  "restrictions",
  "contentFormat",
  "appearance",
  "contentStyle",
  "capability",
  "lifeStyle",
  "occupation",
  "interest",
  "categoryExperience",
  "canCreateWith",
  "language",
] as const;

export function serializeBrowseListingParams(
  filters: Filters,
  search: string,
  page: number = 1,
): string {
  const params = new URLSearchParams();

  if (page > 1) {
    params.set("page", page.toString());
  }

  const query = search.trim();
  if (query) params.set("q", query);

  const city = filters.city.trim();
  if (city) params.set("city", city);

  // Multi-value params
  for (const key of MULTI_VALUE_KEYS) {
    for (const value of normalizeMultiValue(filters[key])) {
      params.append(key, value);
    }
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

  const ageGroup = filters.ageGroup.trim();
  if (ageGroup) params.set("ageGroup", ageGroup);

  return params.toString();
}
