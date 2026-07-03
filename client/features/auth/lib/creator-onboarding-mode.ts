export type CreatorOnboardingMode = "approval_first" | "profile_first";

export function getCreatorOnboardingMode(): CreatorOnboardingMode {
  return process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE === "profile_first"
    ? "profile_first"
    : "approval_first";
}

export function isProfileFirstOnboardingMode(): boolean {
  return getCreatorOnboardingMode() === "profile_first";
}
