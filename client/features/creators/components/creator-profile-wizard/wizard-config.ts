import {
  BadgeCheck,
  Clapperboard,
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
  | "capabilities"
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
    id: "capabilities",
    label: "Capabilities",
    title: "Show brands what you can create",
    tagline: "The more accurate your capabilities, the better your matches.",
    icon: Clapperboard,
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
    id: "pricing",
    label: "Pricing",
    title: "Pricing, delivery & add-ons",
    tagline: "Set your rates, turnaround and the extras brands can book.",
    icon: IndianRupee,
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
    label: "What do you love creating the most?",
    required: true,
  },
  {
    dimension: "CATEGORY_EXPERIENCE",
    label: "Which categories have you created for before?",
    required: true,
  },
  {
    dimension: "APPEARANCE",
    label: "How would you describe your on-camera look?",
    help: "This helps brands find creators that fit their campaigns.",
    max: 2,
  },
  {
    dimension: "OCCUPATION",
    label: "What do you do besides creating content?",
  },
];

/** Facet groups rendered on Step 3 — Content Capabilities. */
export const CAPABILITY_FACET_GROUPS: WizardFacetGroup[] = [
  {
    dimension: "CONTENT_FORMAT",
    label: "Who can appear in videos with you?",
    required: true,
  },
  {
    dimension: "CAPABILITY",
    label: "Content formats you can deliver",
  },
  {
    dimension: "CONTENT_STYLE",
    label: "How do brands usually describe your vibe?",
    help: "Optional — pick up to three.",
    max: 3,
  },
  {
    dimension: "LIFE_STYLE",
    label: "Where can you shoot?",
  },
  {
    dimension: "AI_CONTENT_PERMISSION",
    label: "Are you open to AI-assisted content?",
  },
];

export const BIO_MIN_CHARS = 120;
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
  /** Number of portfolio videos; 3+ earns the full portfolio weight. */
  portfolioCount: number;
};

const STRENGTH_WEIGHTS = {
  photo: 12,
  name: 8,
  dob: 6,
  gender: 5,
  city: 8,
  language: 8,
  bio: 12,
  niche: 13,
  package: 12,
  introVideo: 4,
  portfolio: 12,
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
  score +=
    Math.min(signals.portfolioCount / PORTFOLIO_TARGET, 1) *
    STRENGTH_WEIGHTS.portfolio;

  const pct = Math.max(0, Math.min(100, Math.round(score)));

  // Ordered by impact — the first unmet signal becomes the hint.
  let hint = "Your profile is looking strong. Keep it fresh to stay on top.";
  if (signals.portfolioCount < PORTFOLIO_TARGET)
    hint = "Add portfolio videos to appear in more searches.";
  if (!signals.hasNiche)
    hint = "Pick your niche so the right briefs find you.";
  if (!signals.hasBio) hint = "Add a short bio brands can connect with.";
  if (!signals.hasPhoto) hint = "Add a profile photo to build instant trust.";
  if (!signals.hasName) hint = "Start with your name so brands know you.";

  return { pct, hint };
}
