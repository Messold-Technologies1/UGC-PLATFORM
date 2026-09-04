import { CreatorFacetDimension, CreatorGender } from '@prisma/client';

/** Minimum number of public portfolio videos required to go live. */
export const MIN_PORTFOLIO_VIDEOS = 3;

/** Number of secondary niches required to go live (in addition to the primary). */
export const REQUIRED_SECONDARY_NICHES = 2;

/**
 * Single-select facet dimensions a creator must have a selection in before
 * going live. The niche (CONTENT_CATEGORY) is checked separately because it
 * requires a primary + a fixed number of secondary picks; languages are
 * checked separately too. "Open to" is optional.
 */
export const REQUIRED_FACET_DIMENSIONS: CreatorFacetDimension[] = [
  CreatorFacetDimension.CREATOR_TYPE,
  CreatorFacetDimension.OCCUPATION,
  CreatorFacetDimension.APPEARANCE,
];

const FACET_LABELS: Record<CreatorFacetDimension, string> = {
  CONTENT_CATEGORY: "Creator's category",
  CREATOR_TYPE: 'Creator type',
  OCCUPATION: 'Occupation',
  APPEARANCE: 'Appearance',
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
  /** CONTENT_CATEGORY selections with rank 0 (the primary niche). */
  nichePrimaryCount: number;
  /** CONTENT_CATEGORY selections with rank > 0 (secondary niches). */
  nicheSecondaryCount: number;
  /** Number of "Open to" (restriction) opt-ins. Optional — not required to go live. */
  restrictionCount: number;
  languageCount: number;
  packageCount: number;
  publicVideoCount: number;
  /**
   * Whether the creator has priced every mandatory add-on
   * (CreatorAddOnOption.mandatory). Required to go live.
   */
  mandatoryAddOnsPriced: boolean;
  /**
   * Whether the creator has an active Instagram connection (OAuth). Required to
   * go live so brands see a verified handle and reach.
   */
  instagramConnected: boolean;
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
  { key: 'primaryNiche', label: 'Primary niche' },
  {
    key: 'secondaryNiches',
    label: `${REQUIRED_SECONDARY_NICHES} secondary niches`,
  },
  { key: 'creatorType', label: FACET_LABELS[CreatorFacetDimension.CREATOR_TYPE] },
  { key: 'occupation', label: FACET_LABELS[CreatorFacetDimension.OCCUPATION] },
  { key: 'appearance', label: FACET_LABELS[CreatorFacetDimension.APPEARANCE] },
  { key: 'language', label: 'At least one language' },
  { key: 'package', label: 'At least one package' },
  { key: 'mandatoryAddOns', label: 'Priced mandatory add-ons' },
  {
    key: 'portfolioVideos',
    label: `At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`,
  },
  { key: 'instagram', label: 'Instagram connected' },
] as const;

export type IdentitySectionInput = {
  selectedFacetDimensions: Iterable<CreatorFacetDimension>;
  nichePrimaryCount: number;
  nicheSecondaryCount: number;
};

/**
 * Identity wizard step: primary niche + secondary niches + creator type,
 * occupation and appearance. Used for the listed-creators outreach export.
 */
export function isIdentitySectionComplete(input: IdentitySectionInput): boolean {
  if (input.nichePrimaryCount < 1) return false;
  if (input.nicheSecondaryCount < REQUIRED_SECONDARY_NICHES) return false;
  const selected = new Set<CreatorFacetDimension>(input.selectedFacetDimensions);
  return REQUIRED_FACET_DIMENSIONS.every((dimension) => selected.has(dimension));
}

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

  // Niche: one primary + a fixed number of secondary picks.
  if (input.nichePrimaryCount < 1) missing.push('Primary niche');
  if (input.nicheSecondaryCount < REQUIRED_SECONDARY_NICHES) {
    missing.push(`${REQUIRED_SECONDARY_NICHES} secondary niches`);
  }

  // Single-select content facets.
  const selected = new Set<CreatorFacetDimension>(input.selectedFacetDimensions);
  for (const dimension of REQUIRED_FACET_DIMENSIONS) {
    if (!selected.has(dimension)) missing.push(FACET_LABELS[dimension]);
  }

  // "Open to" is optional — creators can go live with zero restriction opt-ins.

  if (input.languageCount < 1) missing.push('At least one language');

  // Packages
  if (input.packageCount < 1) missing.push('At least one package');
  if (!input.mandatoryAddOnsPriced) missing.push('Priced mandatory add-ons');

  // Portfolio
  if (input.publicVideoCount < MIN_PORTFOLIO_VIDEOS) {
    missing.push(`At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`);
  }

  // Connected accounts — an active Instagram connection is required to go live.
  if (!input.instagramConnected) missing.push('Instagram connected');

  return { complete: missing.length === 0, missing };
}
