export type FilterValueCount = { value: string; searches: number };

export type FilterUsage = {
  key: string;
  searches: number;
  /** Percentage of sampled searches that set this filter. */
  shareOfSearches: number;
  topValues: FilterValueCount[];
};

export type CreatorSearchAnalytics = {
  from: string;
  to: string;
  totalSearches: number;
  /** Searches that set no filter at all — someone just opened the page. */
  unfilteredSearches: number;
  zeroResultSearches: number;
  byAudience: { audience: string; searches: number }[];
  filters: FilterUsage[];
  topSearchTerms: { term: string; searches: number }[];
  topZeroResultFilters: { key: string; searches: number }[];
};

/**
 * OTHER is a creator or admin browsing — never counted as a brand. LAPSED is a
 * signed-in user whose access token had expired, which the browse route cannot
 * identify but must not call a guest.
 */
export type SearchAudience =
  | "BRAND"
  | "AGENCY"
  | "GUEST"
  | "LAPSED"
  | "OTHER";


/** Filter keys as the API names them, mapped to what the filter bar calls them. */
export const FILTER_LABELS: Record<string, string> = {
  search: "Search box",
  city: "City / location",
  contentCategory: "Content category",
  gender: "Gender",
  ageGroup: "Age group",
  minAge: "Min age",
  maxAge: "Max age",
  creatorType: "Creator type",
  appearance: "Appearance",
  occupation: "Occupation",
  language: "Language",
  restrictions: "Restrictions",
  onLocationAvailable: "Available on location",
  minPrice: "Min price",
  maxPrice: "Max price",
  maxDeliveryDays: "Delivery within",
  minFollowers: "Min followers",
  maxFollowers: "Max followers",
};

export function filterLabel(key: string): string {
  return FILTER_LABELS[key] ?? key;
}

export type ActorSearchRow = {
  /** The agency's id when an agency searched, otherwise the brand profile's. */
  actorId: string;
  kind: "BRAND" | "AGENCY";
  /** The agency's or brand's own name. */
  label: string;
  /** For an agency: the brands it was acting for, by name. */
  onBehalfOf: string[];
  searches: number;
  zeroResultSearches: number;
  lastSearchedAt: string;
  filters: { key: string; searches: number; topValues: string[] }[];
};
