import {
  BadgeCheck,
  Film,
  IndianRupee,
  Images,
  MapPin,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  MIN_PORTFOLIO_VIDEOS,
  REQUIRED_FACET_DIMENSIONS,
  REQUIRED_SECONDARY_NICHES,
  type GoLiveSnapshot,
} from "@/features/creators/lib/go-live-requirements";

export type WizardStepId =
  | "about"
  | "base"
  | "identity"
  | "intro-video"
  | "portfolio"
  | "pricing"
  | "review"
  | "go-live";

export type WizardStep = {
  id: WizardStepId;
  /** Short label shown on the left-rail nav. */
  label: string;
  /** Full title shown at the top of the content pane. */
  title: string;
  /** One-line promise that tells the creator why this step matters. */
  tagline: string;
  icon: React.ComponentType<{ size?: number }>;
  /** Whether the step is interactive yet. Non-ready steps show a roadmap teaser. */
  ready: boolean;
};

/**
 * Creator onboarding steps, in order. About You is always reachable first;
 * later steps unlock as the creator saves each one.
 */
export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "about",
    label: "About You",
    title: "Let's introduce you",
    tagline: "This is how brands will first recognize you.",
    icon: UserRound,
    ready: true,
  },
  {
    id: "base",
    label: "Your Base",
    title: "Where you create",
    tagline: "Your city and languages help brands find and book you.",
    icon: MapPin,
    ready: false,
  },
  {
    id: "identity",
    label: "Identity",
    title: "Help brands discover you",
    tagline: "The better your profile reflects your content, the easier brands can find you.",
    icon: Sparkles,
    ready: false,
  },
  {
    id: "pricing",
    label: "Pricing",
    title: "Pricing, delivery & add-ons",
    tagline: "Set your rates, turnaround and the extras brands can book.",
    icon: IndianRupee,
    ready: false,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    title: "Your portfolio",
    tagline: "Your best reels — proof that you deliver scroll-stopping work.",
    icon: Images,
    ready: false,
  },
  {
    id: "intro-video",
    label: "Intro Video",
    title: "Your intro video",
    tagline: "A 30-second hello that turns profile views into bookings.",
    icon: Film,
    ready: false,
  },
  {
    id: "review",
    label: "Review",
    title: "Review your profile",
    tagline: "One last look before brands do.",
    icon: BadgeCheck,
    ready: false,
  },
  {
    id: "go-live",
    label: "Go Live",
    title: "Go live",
    tagline: "Your profile is submitted — hang tight while we review it.",
    icon: Rocket,
    ready: false,
  },
];

import type { CreatorFacetDimension } from "@/features/creators/api/get-creator-facet-options";

export type WizardFacetGroup = {
  dimension: Exclude<CreatorFacetDimension, "LANGUAGE">;
  /** Design-copy heading shown above the chips. */
  label: string;
  help?: string;
  required?: boolean;
  /** Optional cap on how many chips can be selected. */
  max?: number;
};

/** Facet groups rendered on the Identity step. */
export const IDENTITY_FACET_GROUPS: WizardFacetGroup[] = [
  {
    dimension: "CONTENT_CATEGORY",
    label: "What's your niche?",
    help: "The topics you create about most. Brands search by niche to find creators who fit their campaign.",
    required: true,
  },
  {
    dimension: "CREATOR_TYPE",
    label: "What's your creator type?",
    help: "Helps brands match you to briefs that need a specific persona — mom, couple, student, and more.",
  },
  {
    dimension: "OCCUPATION",
    label: "What do you do besides creating content?",
    help: "Adds context about your day-to-day life — useful for authentic lifestyle and testimonial content.",
  },
  {
    dimension: "APPEARANCE",
    label: "Appearance",
    help: "Brands often filter by appearance for product fit and on-camera diversity.",
  },
];

/** "Open to" — sensitive categories the creator opts into (stored as restrictions). */
export const OPEN_TO_OPTIONS = [
  "Gambling / Betting",
  "Lingerie",
  "Intimacy / Adult",
  "Dating / Dating Apps",
  "Night Clubs",
] as const;

export const BIO_MIN_CHARS = 100;
export const BIO_MAX_CHARS = 500;

/**
 * The Profile Strength meter is derived from the SAME `GoLiveSnapshot` the
 * go-live checklist uses (`computeGoLiveMissing`), so the two can never drift:
 * a pre-listing profile reads 100% if and only if every go-live requirement is
 * met. The optional intro video is the one item beyond go-live — it counts only
 * once a creator is listed, as the final few percent (see `includeIntroVideo`).
 *
 * Every go-live requirement carries a weight; the requirement weights sum to 96
 * and the intro video is the remaining 4. Pre-listing the intro video is
 * excluded and the reachable max (96) is rescaled to 100.
 */
const STRENGTH_WEIGHTS = {
  // Identity & trust
  photo: 8,
  name: 4,
  bio: 8,
  dob: 2,
  gender: 2,
  email: 3,
  // Location & logistics
  country: 2,
  state: 2,
  city: 3,
  shippingAddress: 3,
  // Niche & categories (the "Identity" step)
  primaryNiche: 6,
  secondaryNiches: 6,
  creatorType: 3,
  occupation: 3,
  appearance: 3,
  language: 4,
  // Offer
  package: 6,
  packageDefaults: 2,
  mandatoryAddOns: 2,
  // Proof & reach
  portfolio: 12,
  instagram: 6,
  // Policies
  policies: 6,
  // Beyond go-live (listed creators only)
  introVideo: 4,
} as const;

/** Sum of every requirement weight excluding the post-listing intro video. */
const GO_LIVE_WEIGHT_TOTAL = 100 - STRENGTH_WEIGHTS.introVideo; // 96

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Turns a go-live snapshot into a 0–100 Profile Strength percentage plus a
 * short, actionable hint pointing at the highest-impact thing still missing.
 *
 * `includeIntroVideo` (true once the creator is listed) folds the optional
 * intro video into the final 4%; before listing it is excluded and the score is
 * rescaled so an otherwise go-live-ready profile reads 100%, not 96%.
 */
export function computeProfileStrength(
  snapshot: GoLiveSnapshot,
  options: { includeIntroVideo?: boolean; hasIntroVideo?: boolean } = {},
): {
  pct: number;
  hint: string;
} {
  const includeIntroVideo = options.includeIntroVideo ?? true;
  const facets = new Set(snapshot.selectedFacetDimensions);

  let score = 0;
  if (snapshot.hasPhoto) score += STRENGTH_WEIGHTS.photo;
  if (!isBlank(snapshot.displayName)) score += STRENGTH_WEIGHTS.name;
  if (!isBlank(snapshot.bio)) score += STRENGTH_WEIGHTS.bio;
  if (!isBlank(snapshot.dateOfBirth)) score += STRENGTH_WEIGHTS.dob;
  if (!isBlank(snapshot.gender)) score += STRENGTH_WEIGHTS.gender;
  if (!isBlank(snapshot.contactEmail)) score += STRENGTH_WEIGHTS.email;
  if (!isBlank(snapshot.countryName)) score += STRENGTH_WEIGHTS.country;
  if (!isBlank(snapshot.stateName)) score += STRENGTH_WEIGHTS.state;
  if (!isBlank(snapshot.city)) score += STRENGTH_WEIGHTS.city;
  if (!isBlank(snapshot.shippingAddress))
    score += STRENGTH_WEIGHTS.shippingAddress;
  if (snapshot.nichePrimaryCount >= 1) score += STRENGTH_WEIGHTS.primaryNiche;
  if (snapshot.nicheSecondaryCount >= REQUIRED_SECONDARY_NICHES)
    score += STRENGTH_WEIGHTS.secondaryNiches;
  if (facets.has("CREATOR_TYPE")) score += STRENGTH_WEIGHTS.creatorType;
  if (facets.has("OCCUPATION")) score += STRENGTH_WEIGHTS.occupation;
  if (facets.has("APPEARANCE")) score += STRENGTH_WEIGHTS.appearance;
  if (snapshot.languageCount >= 1) score += STRENGTH_WEIGHTS.language;
  if (snapshot.hasPackage) score += STRENGTH_WEIGHTS.package;
  if (snapshot.packageDefaultsConfirmed)
    score += STRENGTH_WEIGHTS.packageDefaults;
  if (snapshot.mandatoryAddOnsPriced) score += STRENGTH_WEIGHTS.mandatoryAddOns;
  score +=
    Math.min(snapshot.publicVideoCount / MIN_PORTFOLIO_VIDEOS, 1) *
    STRENGTH_WEIGHTS.portfolio;
  if (snapshot.instagramConnected) score += STRENGTH_WEIGHTS.instagram;
  if (snapshot.policiesAccepted) score += STRENGTH_WEIGHTS.policies;
  if (includeIntroVideo && options.hasIntroVideo)
    score += STRENGTH_WEIGHTS.introVideo;

  // Pre-listing the reachable max is GO_LIVE_WEIGHT_TOTAL (96); rescale to 100
  // so a go-live-ready profile reads 100% rather than being capped at 96%.
  const maxScore = includeIntroVideo ? 100 : GO_LIVE_WEIGHT_TOTAL;
  const pct = Math.max(0, Math.min(100, Math.round((score / maxScore) * 100)));

  // Ordered by impact — the last matching line wins (highest priority).
  const missingFacet = REQUIRED_FACET_DIMENSIONS.some((d) => !facets.has(d));
  let hint = "Your profile is looking strong. Keep it fresh to stay on top.";
  if (snapshot.publicVideoCount < MIN_PORTFOLIO_VIDEOS)
    hint = "Add portfolio videos to appear in more searches.";
  if (!snapshot.policiesAccepted)
    hint = "Accept the go-live policies to publish your profile.";
  if (
    snapshot.nicheSecondaryCount < REQUIRED_SECONDARY_NICHES ||
    snapshot.nichePrimaryCount < 1 ||
    missingFacet
  )
    hint = "Finish your Identity step — niches and categories.";
  if (!snapshot.instagramConnected)
    hint = "Connect Instagram so brands can verify your reach.";
  if (!snapshot.hasPackage)
    hint = "Set up a package so brands can book you.";
  if (isBlank(snapshot.bio))
    hint = "Add a short bio brands can connect with.";
  if (!snapshot.hasPhoto)
    hint = "Add a profile photo to build instant trust.";
  if (isBlank(snapshot.displayName))
    hint = "Start with your name so brands know you.";

  return { pct, hint };
}
