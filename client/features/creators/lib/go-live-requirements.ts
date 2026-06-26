/**
 * Client mirror of the server Go-Live checklist
 * (`server/src/creator-profile/creator-profile-completeness.util.ts`).
 *
 * Used to gate the "Go Live" action (no API call until complete) and to render
 * the "complete these fields" banner. The server re-evaluates authoritatively
 * and owns the `completeProfile` latch — keep the two lists in sync.
 */

export const MIN_PORTFOLIO_VIDEOS = 3;

/**
 * Facet dimensions that must have at least one selection. Only these three niche
 * facets are required; all other dimensions are optional. Keep in sync with the
 * server (`creator-profile-completeness.util.ts`).
 */
export const REQUIRED_FACET_DIMENSIONS = [
  "CONTENT_FORMAT",
  "CONTENT_CATEGORY",
  "CATEGORY_EXPERIENCE",
] as const;

const FACET_LABELS: Record<string, string> = {
  CONTENT_FORMAT: "Content format",
  APPEARANCE: "Appearance",
  CONTENT_STYLE: "Content style",
  CAPABILITY: "Capabilities",
  CONTENT_CATEGORY: "Content category",
  CATEGORY_EXPERIENCE: "Category experience",
  CAN_CREATE_WITH: "Can create with",
  OCCUPATION: "Occupation",
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
  languageCount: number;
  hasPackage: boolean;
  publicVideoCount: number;
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

  const selected = new Set(snapshot.selectedFacetDimensions);
  for (const dimension of REQUIRED_FACET_DIMENSIONS) {
    if (!selected.has(dimension)) missing.push(FACET_LABELS[dimension]);
  }
  if (snapshot.languageCount < 1) missing.push("At least one language");

  if (!snapshot.hasPackage) missing.push("At least one package");

  if (snapshot.publicVideoCount < MIN_PORTFOLIO_VIDEOS) {
    missing.push(`At least ${MIN_PORTFOLIO_VIDEOS} portfolio videos`);
  }

  return missing;
}
