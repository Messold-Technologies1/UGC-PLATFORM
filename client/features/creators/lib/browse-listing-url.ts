import type { Filters } from "../components/creator-filters";
import { DEFAULT_FILTERS } from "../components/creator-filters";


export function parseBrowseListingParams(
  sp: Pick<URLSearchParams, "get">,
): { filters: Filters; search: string } {
  return {
    search: sp.get("q") ?? "",
    filters: {
      city: sp.get("city") ?? DEFAULT_FILTERS.city,
      category: sp.get("category") ?? DEFAULT_FILTERS.category,
      gender: sp.get("gender") ?? DEFAULT_FILTERS.gender,
      minPrice: sp.get("minPrice") ?? DEFAULT_FILTERS.minPrice,
      maxPrice: sp.get("maxPrice") ?? DEFAULT_FILTERS.maxPrice,
      minRating: sp.get("minRating") ?? DEFAULT_FILTERS.minRating,
      travelAvailable: sp.get("travel") === "true",
      storeVisit: sp.get("storeVisit") === "true",
    },
  };
}


export function serializeBrowseListingParams(
  filters: Filters,
  search: string,
): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (filters.city !== DEFAULT_FILTERS.city) params.set("city", filters.city);
  if (filters.category !== DEFAULT_FILTERS.category)
    params.set("category", filters.category);
  if (filters.gender !== DEFAULT_FILTERS.gender)
    params.set("gender", filters.gender);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.minRating) params.set("minRating", filters.minRating);
  if (filters.travelAvailable) params.set("travel", "true");
  if (filters.storeVisit) params.set("storeVisit", "true");
  return params.toString();
}
