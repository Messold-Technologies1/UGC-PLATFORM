import type { Creator } from "../types";


export function deriveCreatorFilterOptions(creators: Creator[]) {
  const categories = new Set<string>();
  const cities = new Set<string>();
  for (const c of creators) {
    const fromApi = c.categories?.length
      ? c.categories
      : [c.category].filter(Boolean);
    for (const raw of fromApi) {
      const cat = raw?.trim();
      if (cat) categories.add(cat);
    }
    const loc = c.location?.trim();
    if (loc) cities.add(loc);
  }
  return {
    categoryOptions: [...categories].sort((a, b) => a.localeCompare(b)),
    cityOptions: [...cities].sort((a, b) => a.localeCompare(b)),
  };
}
