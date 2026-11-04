/**
 * Template-agnostic view model for the creator public page.
 *
 * Every public-page template (v1..v8) renders from this one shape. Templates
 * own layout and styling only — all data shaping lives in
 * `use-public-profile-view-model.ts`, so adding a template never duplicates
 * formatting, facet grouping, or pricing logic.
 */
import type { LucideIcon } from "lucide-react";

/** Facet rows shown in the "About this creator" block, in display order. */
export type PublicProfileFactKey =
  | "CONTENT_CATEGORY"
  | "CREATOR_TYPE"
  | "APPEARANCE"
  | "OCCUPATION"
  | "LANGUAGE"
  | "ON_LOCATION"
  | "WORKED_WITH";

export type PublicProfileFact = {
  key: PublicProfileFactKey;
  /** Human label, e.g. "Content category". */
  label: string;
  values: string[];
  icon: LucideIcon;
  /** ON_LOCATION only — drives the availability dot/badge in the designs. */
  available?: boolean;
};

export type PublicProfileMedia = {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  /** True for the creator's intro reel, which always sorts first. */
  isIntro: boolean;
};

export type PublicProfilePackage = {
  /** Null when the API omits it (package not independently orderable). */
  id: string | null;
  name: string;
  price: number;
  /** Localised, e.g. "₹3,000". */
  priceLabel: string;
  deliverables: string[];
  /** e.g. "5 days". */
  deliveryLabel: string;
  /** e.g. "60s". */
  lengthLabel: string;
  /** e.g. "2". */
  revisionsLabel: string;
};

export type PublicProfileAddOn = {
  id: string;
  name: string;
  price: number;
  priceLabel: string;
  selected: boolean;
};

export type AudienceBucket = {
  key: string;
  value: number;
  /** Percentage of the total, 0-100, rounded. */
  share: number;
};

export type PublicProfileAudience = {
  followersLabel: string;
  reachLabel: string | null;
  profileViewsLabel: string | null;
  ages: AudienceBucket[];
  gender: AudienceBucket[];
  cities: AudienceBucket[];
  countries: AudienceBucket[];
  /** Largest age bucket — several templates call it out explicitly. */
  topAge: AudienceBucket | null;
};

export type PublicProfileReview = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** Brand name snapshot, or "Brand" when absent. */
  authorLabel: string;
  authorInitial: string;
  authorLogoUrl: string | null;
  /** Package the review was left for, when the snapshot exists. */
  packageLabel: string | null;
};

export type PublicProfileReviews = {
  count: number;
  average: number;
  items: PublicProfileReview[];
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type PublicProfileViewModel = {
  /**
   * Public headline, e.g. "Beauty Creator". Creators are anonymous to brands:
   * this is derived from the primary niche and is NEVER the real display name.
   */
  headline: string;
  /** `headline` split for templates that style the last word differently. */
  headlineLead: string;
  headlineTail: string;
  initials: string;
  avatarUrl: string | null;
  /** Admin-approved; every reachable public profile is approved. */
  verified: boolean;
  creatorTypeLabel: string | null;
  /** "Thrissur, Kerala, India" */
  locationLabel: string | null;
  /** "Thrissur" */
  cityLabel: string | null;
  bio: string | null;
  languages: string[];
  languagesInline: string;
  categories: string[];
  facts: PublicProfileFact[];
  /** Content the creator is open to, derived from profile restrictions. */
  openTo: string[];

  /** Intro reel first, then portfolio, in viewer order. */
  media: PublicProfileMedia[];
  intro: PublicProfileMedia | null;
  portfolio: PublicProfileMedia[];
  portfolioCountLabel: string;

  packages: PublicProfilePackage[];
  selectedPackage: PublicProfilePackage | null;
  selectPackage: (id: string) => void;
  addOns: PublicProfileAddOn[];
  toggleAddOn: (id: string) => void;
  /** Selected package + selected add-ons. */
  total: number;
  totalLabel: string;

  /** Null when Instagram is not connected or has no snapshot. */
  audience: PublicProfileAudience | null;
  /** Null when the creator has no reviews yet. */
  reviews: PublicProfileReviews | null;

  /** Routes buyers to checkout, anonymous visitors to registration. */
  book: () => void;
  isBuyer: boolean;
};
