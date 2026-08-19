import {
  BadgeCheck,
  Film,
  IndianRupee,
  Images,
  Rocket,
  Sparkles,
  UserRound,
} from "lucide-react";

export type WizardStepId =
  | "about"
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
 * The eight milestones of the redesigned creator onboarding, in the order
 * defined by the Creator Onboarding design. Only "About you" is interactive in
 * this iteration; the rest surface on the rail so the whole journey stays
 * visible and the creator can see how far they have to go.
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
    tagline: "Flip the switch and start receiving briefs.",
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

/** Facet groups rendered on Step 2 — Creator Identity & Discovery. */
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
 * Signals that feed the Profile Strength meter. Each maps to a weight; the
 * total across every signal is 100.
 */
export type StrengthSignals = {
  hasPhoto: boolean;
  hasName: boolean;
  hasDob: boolean;
  hasGender: boolean;
  hasCity: boolean;
  hasLanguage: boolean;
  hasBio: boolean;
  hasNiche: boolean;
  hasPackage: boolean;
  hasIntroVideo: boolean;
  /** Whether an Instagram account is connected. */
  hasInstagram: boolean;
  /** Number of portfolio videos; 3+ earns the full portfolio weight. */
  portfolioCount: number;
};

// Weights sum to 100 so a fully-complete profile reads 100%.
const STRENGTH_WEIGHTS = {
  photo: 11,
  name: 7,
  dob: 5,
  gender: 5,
  city: 7,
  language: 7,
  bio: 11,
  niche: 12,
  package: 11,
  introVideo: 4,
  portfolio: 12,
  instagram: 8,
} as const;

const PORTFOLIO_TARGET = 3;

/**
 * Turns completeness signals into a 0–100 Profile Strength percentage plus a
 * short, actionable hint pointing at the highest-impact thing still missing.
 */
export function computeProfileStrength(signals: StrengthSignals): {
  pct: number;
  hint: string;
} {
  let score = 0;
  if (signals.hasPhoto) score += STRENGTH_WEIGHTS.photo;
  if (signals.hasName) score += STRENGTH_WEIGHTS.name;
  if (signals.hasDob) score += STRENGTH_WEIGHTS.dob;
  if (signals.hasGender) score += STRENGTH_WEIGHTS.gender;
  if (signals.hasCity) score += STRENGTH_WEIGHTS.city;
  if (signals.hasLanguage) score += STRENGTH_WEIGHTS.language;
  if (signals.hasBio) score += STRENGTH_WEIGHTS.bio;
  if (signals.hasNiche) score += STRENGTH_WEIGHTS.niche;
  if (signals.hasPackage) score += STRENGTH_WEIGHTS.package;
  if (signals.hasIntroVideo) score += STRENGTH_WEIGHTS.introVideo;
  if (signals.hasInstagram) score += STRENGTH_WEIGHTS.instagram;
  score +=
    Math.min(signals.portfolioCount / PORTFOLIO_TARGET, 1) *
    STRENGTH_WEIGHTS.portfolio;

  const pct = Math.max(0, Math.min(100, Math.round(score)));

  // Ordered by impact — the last matching line wins (highest priority).
  let hint = "Your profile is looking strong. Keep it fresh to stay on top.";
  if (signals.portfolioCount < PORTFOLIO_TARGET)
    hint = "Add portfolio videos to appear in more searches.";
  if (!signals.hasInstagram)
    hint = "Connect Instagram so brands can verify your reach.";
  if (!signals.hasNiche)
    hint = "Pick your niche so the right briefs find you.";
  if (!signals.hasBio) hint = "Add a short bio brands can connect with.";
  if (!signals.hasPhoto) hint = "Add a profile photo to build instant trust.";
  if (!signals.hasName) hint = "Start with your name so brands know you.";

  return { pct, hint };
}
