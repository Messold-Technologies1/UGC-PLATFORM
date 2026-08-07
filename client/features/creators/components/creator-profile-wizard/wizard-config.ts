import {
  BadgeCheck,
  Clapperboard,
  Film,
  Rocket,
  Sparkles,
  Tags,
  UserRound,
} from "lucide-react";

export type WizardStepId =
  | "about"
  | "identity"
  | "capabilities"
  | "intro-video"
  | "portfolio"
  | "pricing"
  | "review";

export type WizardStep = {
  id: WizardStepId;
  /** Short label shown on the milestone rail. */
  label: string;
  /** Full title shown at the top of the step panel. */
  title: string;
  /** One-line promise that tells the creator why this step matters. */
  tagline: string;
  icon: React.ComponentType<{ size?: number }>;
  /** Whether the step is interactive yet. Non-ready steps show a roadmap teaser. */
  ready: boolean;
};

/**
 * The milestone order for the redesigned creator profile editor. Only the
 * first step ("About you") is interactive in this iteration — the remaining
 * milestones are surfaced on the rail so the creator can see the whole journey
 * and how far they have to go.
 */
export const WIZARD_STEPS: WizardStep[] = [
  {
    id: "about",
    label: "About you",
    title: "Let's start with you",
    tagline: "The essentials brands see first — your name, face and voice.",
    icon: UserRound,
    ready: true,
  },
  {
    id: "identity",
    label: "Identity & discovery",
    title: "Creator identity & discovery",
    tagline: "Your niche and vibe — this is how brands find you in search.",
    icon: Sparkles,
    ready: false,
  },
  {
    id: "capabilities",
    label: "Capabilities",
    title: "Content capabilities",
    tagline: "What you can shoot, edit and deliver — your creative range.",
    icon: Clapperboard,
    ready: false,
  },
  {
    id: "intro-video",
    label: "Intro video",
    title: "Your intro video",
    tagline: "A 30-second hello that turns profile views into bookings.",
    icon: Film,
    ready: false,
  },
  {
    id: "portfolio",
    label: "Portfolio",
    title: "Portfolio",
    tagline: "Your best reels — proof that you deliver scroll-stopping work.",
    icon: Tags,
    ready: false,
  },
  {
    id: "pricing",
    label: "Pricing & delivery",
    title: "Pricing, delivery & add-ons",
    tagline: "Set your rates, turnaround and the extras brands can book.",
    icon: BadgeCheck,
    ready: false,
  },
  {
    id: "review",
    label: "Go live",
    title: "Review, confirm & go live",
    tagline: "One last look, then flip the switch and start getting briefs.",
    icon: Rocket,
    ready: false,
  },
];

export type LanguageOption = {
  /** Matches the server LANGUAGE facet slug convention (lowercase). */
  slug: string;
  label: string;
};

/**
 * Full list of languages a creator can declare. The label is what we show; the
 * slug mirrors the backend facet slug convention so selections can be persisted
 * against the LANGUAGE facet options where a matching slug exists.
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { slug: "hindi", label: "Hindi" },
  { slug: "english", label: "English" },
  { slug: "bengali", label: "Bengali" },
  { slug: "marathi", label: "Marathi" },
  { slug: "telugu", label: "Telugu" },
  { slug: "tamil", label: "Tamil" },
  { slug: "gujarati", label: "Gujarati" },
  { slug: "urdu", label: "Urdu" },
  { slug: "kannada", label: "Kannada" },
  { slug: "odia", label: "Odia" },
  { slug: "malayalam", label: "Malayalam" },
  { slug: "punjabi", label: "Punjabi" },
  { slug: "assamese", label: "Assamese" },
  { slug: "maithili", label: "Maithili" },
  { slug: "sanskrit", label: "Sanskrit" },
  { slug: "kashmiri", label: "Kashmiri" },
  { slug: "konkani", label: "Konkani" },
  { slug: "sindhi", label: "Sindhi" },
  { slug: "dogri", label: "Dogri" },
  { slug: "manipuri_meitei", label: "Manipuri / Meitei" },
  { slug: "bodo", label: "Bodo" },
  { slug: "santali", label: "Santali" },
  { slug: "nepali", label: "Nepali" },
  { slug: "other", label: "Other" },
];
