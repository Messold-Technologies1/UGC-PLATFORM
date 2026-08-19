/**
 * Client mirror of the server Go-Live checklist
 * (`server/src/creator-profile/creator-profile-completeness.util.ts`).
 *
 * Used to gate the "Go Live" action (no API call until complete) and to render
 * the "complete these fields" banner. The server re-evaluates authoritatively
 * and owns the `completeProfile` latch — keep the two lists in sync.
 */

export const MIN_PORTFOLIO_VIDEOS = 3;
export const REQUIRED_SECONDARY_NICHES = 2;

/**
 * Single-select identity facets that must have a selection. The niche
 * (CONTENT_CATEGORY) is checked separately (primary + secondary counts), and so
 * are languages and "Open to". Keep in sync with the server
 * (`creator-profile-completeness.util.ts`).
 */
export const REQUIRED_FACET_DIMENSIONS = [
  "CREATOR_TYPE",
  "OCCUPATION",
  "APPEARANCE",
] as const;

const FACET_LABELS: Record<string, string> = {
  CONTENT_CATEGORY: "Creator's category",
  CREATOR_TYPE: "Creator type",
  OCCUPATION: "Occupation",
  APPEARANCE: "Appearance",
};

export interface GoLiveSnapshot {
  hasPhoto: boolean;
  hasIntroVideo: boolean;
  displayName: string;
  contactEmail: string;
  bio: string;
  countryName: string;
  stateName: string;
  city: string;
  gender: string;
  dateOfBirth: string;
  shippingAddress: string;
  /** Facet dimension keys that currently have at least one selection. */
  selectedFacetDimensions: string[];
  /** CONTENT_CATEGORY selections with rank 0 (the primary niche). */
  nichePrimaryCount: number;
  /** CONTENT_CATEGORY selections with rank > 0 (secondary niches). */
  nicheSecondaryCount: number;
  /** Number of "Open to" (restriction) opt-ins. */
  restrictionCount: number;
  languageCount: number;
  hasPackage: boolean;
  /** Whether every mandatory add-on has been priced. */
  mandatoryAddOnsPriced: boolean;
  /** Creator confirmed the fixed Standard package defaults. */
  packageDefaultsConfirmed: boolean;
  publicVideoCount: number;
  /**
   * Whether the creator has accepted all required go-live policies
   * (AI Content, Usage Rights, Payout, Creator Guidelines). Client gate;
   * server also requires `acceptedGoLivePolicies: true` on Go Live.
   */
  policiesAccepted: boolean;
  /** Whether the creator has an active Instagram connection (OAuth). */
  instagramConnected: boolean;
}

function blank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/** Human-readable labels for everything still required to go live. */
export function computeGoLiveMissing(snapshot: GoLiveSnapshot): string[] {
  const missing: string[] = [];

  if (!snapshot.hasPhoto) missing.push("Profile photo");
  if (!snapshot.hasIntroVideo) missing.push("Featured video");

  if (blank(snapshot.displayName)) missing.push("Display name");
  if (blank(snapshot.contactEmail)) missing.push("Contact email");
  if (blank(snapshot.bio)) missing.push("Bio");

  if (blank(snapshot.countryName)) missing.push("Country");
  if (blank(snapshot.stateName)) missing.push("State");
  if (blank(snapshot.city)) missing.push("City");
  if (blank(snapshot.gender)) missing.push("Gender");
  if (blank(snapshot.dateOfBirth)) missing.push("Date of birth");
  if (blank(snapshot.shippingAddress)) missing.push("Shipping address");

  if (snapshot.nichePrimaryCount < 1) missing.push("Primary niche");
  if (snapshot.nicheSecondaryCount < REQUIRED_SECONDARY_NICHES) {
    missing.push(`${REQUIRED_SECONDARY_NICHES} secondary niches`);
  }

  const selected = new Set(snapshot.selectedFacetDimensions);
  for (const dimension of REQUIRED_FACET_DIMENSIONS) {
    if (!selected.has(dimension)) missing.push(FACET_LABELS[dimension]);
  }

  if (snapshot.restrictionCount < 1) {
    missing.push('At least one "Open to" option');
  }

  if (snapshot.languageCount < 1) missing.push("At least one language");

  if (!snapshot.hasPackage) missing.push("At least one package");
  if (!snapshot.packageDefaultsConfirmed)
    missing.push("Package defaults confirmation");
  if (!snapshot.mandatoryAddOnsPriced) missing.push("Priced mandatory add-ons");

  if (snapshot.publicVideoCount < MIN_PORTFOLIO_VIDEOS) {
    missing.push(`At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`);
  }

  if (!snapshot.instagramConnected) missing.push("Instagram connected");

  if (!snapshot.policiesAccepted) {
    missing.push("Policy acceptance (AI Content, Usage Rights, Payout, Creator Guidelines)");
  }

  return missing;
}
