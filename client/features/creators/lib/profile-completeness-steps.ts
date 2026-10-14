import type { CreatorProfileRequirementApi } from "@/features/creators/api/types";
import type { WizardStepId } from "@/features/creators/components/creator-profile-wizard/wizard-config";

/**
 * Maps each requirement key the API can report (the server's
 * `LISTED_PROFILE_REQUIREMENTS` catalog) to the profile-wizard step that fixes
 * it, so a creator is sent straight to the right form instead of hunting for
 * it. Unknown keys — a requirement added server-side before this map knows
 * about it — fall back to the first step rather than disappearing.
 */
const REQUIREMENT_STEP: Record<string, WizardStepId> = {
  profilePhoto: "about",
  displayName: "about",
  contactEmail: "about",
  gender: "about",
  dateOfBirth: "about",
  otpVerification: "about",
  instagram: "about",
  country: "base",
  state: "base",
  city: "base",
  shippingAddress: "base",
  primaryNiche: "identity",
  secondaryNiches: "identity",
  creatorType: "identity",
  occupation: "identity",
  appearance: "identity",
  language: "identity",
  package: "pricing",
  mandatoryAddOns: "pricing",
  bio: "portfolio",
  portfolioVideos: "portfolio",
  payoutDetails: "payouts",
};

export type CompletenessStepMeta = {
  title: string;
  /** One line on why a brand or a payout needs this. */
  blurb: string;
};

export const COMPLETENESS_STEP_META: Record<
  WizardStepId,
  CompletenessStepMeta
> = {
  about: {
    title: "About you",
    blurb: "Your photo, contact details and a verified mobile number.",
  },
  base: {
    title: "Your base",
    blurb: "Where you create, and where brands ship products to you.",
  },
  identity: {
    title: "Identity & niches",
    blurb: "The categories brands search you by.",
  },
  pricing: {
    title: "Pricing & add-ons",
    blurb: "What you charge, and the extras brands can book.",
  },
  portfolio: {
    title: "Portfolio & bio",
    blurb: "Proof of the work you deliver.",
  },
  payouts: {
    title: "Payout details",
    blurb: "The bank account or UPI ID we pay your earnings into.",
  },
  "intro-video": {
    title: "Intro video",
    blurb: "A 30-second hello for your profile.",
  },
  review: { title: "Review", blurb: "One last look before brands do." },
  "go-live": { title: "Go live", blurb: "Publish your profile." },
};

/** The order gaps are shown in — the same order the wizard walks. */
const STEP_ORDER: WizardStepId[] = [
  "about",
  "base",
  "identity",
  "pricing",
  "portfolio",
  "payouts",
];

export type CompletenessGroup = {
  step: WizardStepId;
  title: string;
  blurb: string;
  /** Labels of everything missing in this step, in catalog order. */
  items: string[];
};

export function stepForRequirement(key: string): WizardStepId {
  return REQUIREMENT_STEP[key] ?? "about";
}

/**
 * Groups outstanding requirements by the step that fixes them, so a creator
 * makes one trip per step instead of one per field.
 */
export function groupMissingByStep(
  missing: CreatorProfileRequirementApi[],
): CompletenessGroup[] {
  const byStep = new Map<WizardStepId, string[]>();

  for (const requirement of missing) {
    const step = stepForRequirement(requirement.key);
    const items = byStep.get(step);
    if (items) items.push(requirement.label);
    else byStep.set(step, [requirement.label]);
  }

  return STEP_ORDER.filter((step) => byStep.has(step)).map((step) => ({
    step,
    title: COMPLETENESS_STEP_META[step].title,
    blurb: COMPLETENESS_STEP_META[step].blurb,
    items: byStep.get(step) ?? [],
  }));
}

/** Deep link into the wizard step that fixes a gap, returning here afterwards. */
export function profileStepHref(step: WizardStepId, returnTo?: string): string {
  const params = new URLSearchParams({ step });
  if (returnTo) params.set("returnTo", returnTo);
  return `/creator/settings/profile?${params.toString()}`;
}
