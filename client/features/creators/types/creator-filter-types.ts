export interface Filters {
  city: string;
  categories: string[];
  gender: string;
  minPrice: string;
  maxPrice: string;
  onLocationAvailable: boolean;
  industry: string;
  portfolioTag: string;
  restrictions: string[];
  contentFormat: string[];
  appearance: string[];
  contentStyle: string[];
  capability: string[];
  lifeStyle: string[];
  occupation: string[];
  categoryExperience: string[];
  canCreateWith: string[];
  aiContentPermission: string[];
  language: string[];
  ageGroup: string;
}

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;

export const DEFAULT_FILTERS: Filters = {
  city: "",
  categories: [],
  gender: "",
  minPrice: "",
  maxPrice: "",
  onLocationAvailable: false,
  industry: "",
  portfolioTag: "",
  restrictions: [],
  contentFormat: [],
  appearance: [],
  contentStyle: [],
  capability: [],
  lifeStyle: [],
  occupation: [],
  categoryExperience: [],
  canCreateWith: [],
  aiContentPermission: [],
  language: [],
  ageGroup: "",
};
