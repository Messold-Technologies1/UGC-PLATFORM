export interface Filters {
  search: string;
  city: string;
  categories: string[];
  gender: string;
  minPrice: string;
  maxPrice: string;
  maxDeliveryDays: string;
  minFollowers: string;
  maxFollowers: string;
  onLocationAvailable: boolean;
  restrictions: string[];
  creatorType: string[];
  appearance: string[];
  occupation: string[];
  language: string[];
  ageGroup: string;
}

export const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

export const AGE_GROUP_OPTIONS = [
  { value: "AGE_18_24", label: "18 – 24" },
  { value: "AGE_25_34", label: "25 – 34" },
  { value: "AGE_35_44", label: "35 – 44" },
  { value: "AGE_45_54", label: "45 – 54" },
  { value: "AGE_55_PLUS", label: "55+" },
] as const;

export const CREATOR_PRICE_MIN = 0;
export const CREATOR_PRICE_MAX = 10_000;

export const DELIVERY_WITHIN_OPTIONS = [
  { value: "2", label: "Within 2 days" },
  { value: "3", label: "Within 3 days" },
  { value: "5", label: "Within 5 days" },
  { value: "7", label: "Within 7 days" },
] as const;

/**
 * Instagram-follower tiers for the browse filter. Each maps to a min/max pair
 * stored in Filters.minFollowers / maxFollowers (empty max = open-ended).
 */
export const FOLLOWER_RANGE_OPTIONS = [
  { value: "1000-10000", label: "1K – 10K", min: "1000", max: "10000" },
  { value: "10000-50000", label: "10K – 50K", min: "10000", max: "50000" },
  { value: "50000-100000", label: "50K – 100K", min: "50000", max: "100000" },
  {
    value: "100000-500000",
    label: "100K – 500K",
    min: "100000",
    max: "500000",
  },
  { value: "500000-", label: "500K+", min: "500000", max: "" },
] as const;

export const DEFAULT_FILTERS: Filters = {
  search: "",
  city: "",
  categories: [],
  gender: "",
  minPrice: "",
  maxPrice: "",
  maxDeliveryDays: "",
  minFollowers: "",
  maxFollowers: "",
  onLocationAvailable: false,
  restrictions: [],
  creatorType: [],
  appearance: [],
  occupation: [],
  language: [],
  ageGroup: "",
};
