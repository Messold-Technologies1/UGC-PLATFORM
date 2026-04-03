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
  if (fromAll.length > 0) {
    return fromAll.filter(
      (value) => value !== "All" && value !== "All Cities",
    );
  }

  const singleValue = sp.get(key)?.trim();
  if (!singleValue) return [];
  if (singleValue === "All" || singleValue === "All Cities") return [];

  return normalizeMultiValue(singleValue.split(","));
}

export function parseBrowseListingParams(
  sp: Pick<URLSearchParams, "get" | "getAll">,
): { filters: Filters; search: string } {
  return {
    search: sp.get("q") ?? "",
    filters: {
      city: parseMultiValue(sp, "city"),
      category: parseMultiValue(sp, "category"),
      gender: sp.get("gender") ?? DEFAULT_FILTERS.gender,
      minPrice: sp.get("minPrice") ?? DEFAULT_FILTERS.minPrice,
      maxPrice: sp.get("maxPrice") ?? DEFAULT_FILTERS.maxPrice,
      minRating: sp.get("minRating") ?? DEFAULT_FILTERS.minRating,
      travelAvailable: sp.get("travel") === "true",
      storeVisit: sp.get("storeVisit") === "true",
      industryLabel: sp.get("industry") ?? DEFAULT_FILTERS.industryLabel,
      tags: sp.get("tags") ?? DEFAULT_FILTERS.tags,
    },
  };
}


export function serializeBrowseListingParams(
  filters: Filters,
  search: string,
): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  for (const city of normalizeMultiValue(filters.city)) {
    params.append("city", city);
  }
  for (const category of normalizeMultiValue(filters.category)) {
    params.append("category", category);
  }
  if (filters.gender !== DEFAULT_FILTERS.gender)
    params.set("gender", filters.gender);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.travelAvailable) params.set("travel", "true");
  if (filters.storeVisit) params.set("storeVisit", "true");
  if (filters.industryLabel !== DEFAULT_FILTERS.industryLabel)
    params.set("industry", filters.industryLabel);
  if (filters.tags !== DEFAULT_FILTERS.tags) params.set("tags", filters.tags);
  return params.toString();
}
