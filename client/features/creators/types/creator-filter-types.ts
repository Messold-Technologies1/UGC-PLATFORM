export interface Filters {
  city: string;
  categories: string[];
  gender: string;
  minPrice: string;
  maxPrice: string;
  maxDeliveryDays: string;
  onLocationAvailable: boolean;
  restrictions: string[];
  creatorType: string[];
  appearance: string[];
  occupation: string[];
  language: string[];
  ageGroup: string;
}

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;

export const DELIVERY_WITHIN_OPTIONS = [
  { value: "2", label: "Within 2 days" },
  { value: "3", label: "Within 3 days" },
  { value: "5", label: "Within 5 days" },
  { value: "7", label: "Within 7 days" },
] as const;

export const DEFAULT_FILTERS: Filters = {
  city: "",
  categories: [],
  gender: "",
  minPrice: "",
  maxPrice: "",
  maxDeliveryDays: "",
  onLocationAvailable: false,
  restrictions: [],
  creatorType: [],
  appearance: [],
  occupation: [],
  language: [],
  ageGroup: "",
};
