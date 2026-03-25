import type { Creator } from "../types";

/** Unique categories and cities from the current creators list (API data). */
export function deriveCreatorFilterOptions(creators: Creator[]) {
  const categories = new Set<string>();
  const cities = new Set<string>();
  for (const c of creators) {
    const cat = c.category?.trim();
    if (cat) categories.add(cat);
    const loc = c.location?.trim();
    if (loc) cities.add(loc);
  }
  return {
    categoryOptions: [...categories].sort((a, b) => a.localeCompare(b)),
    cityOptions: [...cities].sort((a, b) => a.localeCompare(b)),
  };
}
