import {
  getCreatorOnboardingMode,
  isProfileFirstOnboardingMode,
} from './creator-onboarding-mode';

describe('creator-onboarding-mode', () => {
  it('defaults to approval_first', () => {
    expect(getCreatorOnboardingMode(undefined)).toBe('approval_first');
    expect(isProfileFirstOnboardingMode(undefined)).toBe(false);
  });

  it('recognizes profile_first', () => {
    expect(getCreatorOnboardingMode('profile_first')).toBe('profile_first');
    expect(isProfileFirstOnboardingMode('profile_first')).toBe(true);
  });
});
