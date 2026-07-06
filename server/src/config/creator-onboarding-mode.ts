export type CreatorOnboardingMode = 'approval_first' | 'profile_first';

export function getCreatorOnboardingMode(
  raw: string | undefined,
): CreatorOnboardingMode {
  return raw === 'profile_first' ? 'profile_first' : 'approval_first';
}

export function isProfileFirstOnboardingMode(
  raw: string | undefined,
): boolean {
  return getCreatorOnboardingMode(raw) === 'profile_first';
}
