import { env, type CreatorOnboardingMode } from "../../../lib/env";

export type { CreatorOnboardingMode };

export function getCreatorOnboardingMode(): CreatorOnboardingMode {
  return env.creatorOnboardingMode;
}

export function isProfileFirstOnboardingMode(): boolean {
  return env.creatorOnboardingMode === "profile_first";
}
