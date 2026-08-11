import { CreatorFacetDimension, CreatorGender } from '@prisma/client';

/** Minimum number of public portfolio videos required to go live. */
export const MIN_PORTFOLIO_VIDEOS = 3;

/**
 * Facet dimensions a creator must have at least one selection in before going
 * live. Only the creator's category is required; every other facet dimension
 * (creator type, occupation, appearance, …) is optional. Languages are required
 * separately.
 */
export const REQUIRED_FACET_DIMENSIONS: CreatorFacetDimension[] = [
  CreatorFacetDimension.CONTENT_CATEGORY,
];

const FACET_LABELS: Record<CreatorFacetDimension, string> = {
  CONTENT_FORMAT: 'Content format',
  APPEARANCE: 'Appearance',
  CONTENT_STYLE: 'Content style',
  CAPABILITY: 'Capabilities',
  CONTENT_CATEGORY: "Creator's category",
  CATEGORY_EXPERIENCE: 'Category experience',
  CAN_CREATE_WITH: 'Can create with',
  OCCUPATION: 'Occupation',
  LIFE_STYLE: 'Lifestyle',
  AI_CONTENT_PERMISSION: 'AI content permission',
  CREATOR_TYPE: 'Creator type',
  LANGUAGE: 'Languages',
};

export interface ProfileCompletenessInput {
  profileImageUrl?: string | null;
  introVideoUrl?: string | null;
  displayName?: string | null;
  contactEmail?: string | null;
  bio?: string | null;
  countryName?: string | null;
  stateName?: string | null;
  city?: string | null;
  gender?: CreatorGender | null;
  dateOfBirth?: Date | string | null;
  shippingAddress?: string | null;
  /** Facet dimensions the creator has at least one selection in. */
  selectedFacetDimensions: Iterable<CreatorFacetDimension>;
  languageCount: number;
  packageCount: number;
  publicVideoCount: number;
}

export interface ProfileCompletenessResult {
  complete: boolean;
  /** Human-readable labels for everything still required to go live. */
  missing: string[];
}

/** A single Go-Live requirement: a stable machine `key` and its `label`. */
export interface GoLiveRequirement {
  key: string;
  label: string;
}

/**
 * Ordered catalog of every Go-Live requirement. The `label` of each entry is
 * exactly the string `evaluateProfileCompleteness` pushes into `missing` when
 * that requirement is unmet, so analytics can tally `missing` labels back to a
 * stable key. Keep in lockstep with `evaluateProfileCompleteness` below.
 */
export const GO_LIVE_REQUIREMENTS: readonly GoLiveRequirement[] = [
  { key: 'profilePhoto', label: 'Profile photo' },
  { key: 'introReel', label: 'Intro reel' },
  { key: 'displayName', label: 'Display name' },
  { key: 'contactEmail', label: 'Contact email' },
  { key: 'bio', label: 'Bio' },
  { key: 'country', label: 'Country' },
  { key: 'state', label: 'State' },
  { key: 'city', label: 'City' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'shippingAddress', label: 'Shipping address' },
  { key: 'contentCategory', label: FACET_LABELS[CreatorFacetDimension.CONTENT_CATEGORY] },
  { key: 'language', label: 'At least one language' },
  { key: 'package', label: 'At least one package' },
  {
    key: 'portfolioVideos',
    label: `At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`,
  },
] as const;

function hasText(value?: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Pure evaluation of the Go-Live checklist. Mirrored on the client
 * (`go-live-requirements.ts`); keep the two in sync when requirements change.
 */
export function evaluateProfileCompleteness(
  input: ProfileCompletenessInput,
): ProfileCompletenessResult {
  const missing: string[] = [];

  // Media
  if (!hasText(input.profileImageUrl)) missing.push('Profile photo');
  if (!hasText(input.introVideoUrl)) missing.push('Intro reel');

  // Basic details
  if (!hasText(input.displayName)) missing.push('Display name');
  if (!hasText(input.contactEmail)) missing.push('Contact email');
  if (!hasText(input.bio)) missing.push('Bio');

  // About you (contentVolume, on-location availability and travel radius excluded)
  if (!hasText(input.countryName)) missing.push('Country');
  if (!hasText(input.stateName)) missing.push('State');
  if (!hasText(input.city)) missing.push('City');
  if (!input.gender) missing.push('Gender');
  if (!input.dateOfBirth) missing.push('Date of birth');
  if (!hasText(input.shippingAddress)) missing.push('Shipping address');

  // Niche & content facets
  const selected = new Set<CreatorFacetDimension>(input.selectedFacetDimensions);
  for (const dimension of REQUIRED_FACET_DIMENSIONS) {
    if (!selected.has(dimension)) missing.push(FACET_LABELS[dimension]);
  }
  if (input.languageCount < 1) missing.push('At least one language');

  // Packages
  if (input.packageCount < 1) missing.push('At least one package');

  // Portfolio
  if (input.publicVideoCount < MIN_PORTFOLIO_VIDEOS) {
    missing.push(`At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`);
  }

  return { complete: missing.length === 0, missing };
}
