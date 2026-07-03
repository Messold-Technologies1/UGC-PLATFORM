import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
  stripOnboardingFromHref,
} from '../../../client/features/auth/lib/post-auth-destination';
import { resolveImmediatePostAuthPath } from '../../../client/features/auth/lib/resolve-immediate-post-auth-path';
import { resolveCreatorOnboardingPath } from '../../../client/features/auth/lib/resolve-creator-onboarding-path';
import type { AuthUser } from '../../../client/features/auth/hooks/use-me-query';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE;

function withOnboardingMode<T>(mode: string | undefined, fn: () => T): T {
  if (mode === undefined) {
    delete process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE;
  } else {
    process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE = mode;
  }
  try {
    return fn();
  } finally {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE;
    } else {
      process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE = ORIGINAL_ENV;
    }
  }
}

function createUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    roles: ['CREATOR'],
    primaryRole: 'CREATOR',
    hasCreatorProfile: true,
    hasBrandProfile: false,
    brandAccessRevoked: false,
    ...overrides,
  };
}

describe('Client workspace routing helpers', () => {
  it('sends users with no roles to the continue flow', () => {
    const user = createUser({
      roles: [],
      primaryRole: null,
      hasCreatorProfile: false,
    });

    expect(resolveImmediatePostAuthPath(user, '/creator/jobs')).toBe(
      '/auth/continue?callbackUrl=%2Fcreator%2Fjobs',
    );
    expect(resolvePostAuthRedirectPath(user, '/brand/creators')).toBe(
      '/auth/continue?callbackUrl=%2Fbrand%2Fcreators',
    );
  });

  it('keeps admin users on the admin namespace', () => {
    const user = createUser({
      roles: ['ADMIN', 'BRAND'],
      primaryRole: 'ADMIN',
    });

    expect(resolveImmediatePostAuthPath(user, '/admin/settings')).toBe(
      '/admin',
    );
    expect(resolvePostAuthRedirectPath(user, '/admin/settings')).toBe('/admin');
  });

  it('routes OAuth and login callbacks directly into the matching workspace namespace', () => {
    const user = createUser({
      roles: ['CREATOR', 'BRAND'],
      primaryRole: 'CREATOR',
      hasBrandProfile: true,
    });

    expect(resolveImmediatePostAuthPath(user, '/creator/opportunities')).toBe(
      '/creator/opportunities',
    );
    expect(
      pathAfterWorkspaceSelection(user, 'BRAND', '/brand/orders/42'),
    ).toBe('/brand/orders/42');
  });

  it('falls back to the selected workspace landing page when the callback points at another namespace', () => {
    const user = createUser({
      roles: ['CREATOR', 'BRAND'],
      primaryRole: 'CREATOR',
      hasBrandProfile: true,
    });

    expect(pathAfterWorkspaceSelection(user, 'CREATOR', '/brand/orders/42')).toBe(
      '/creator/orders',
    );
    expect(pathAfterWorkspaceSelection(user, 'BRAND', '/creator/jobs/42')).toBe(
      '/brand/creators',
    );
  });

  it('keeps revoked dual-role users in the continue flow until they choose an allowed route', () => {
    const user = createUser({
      roles: ['CREATOR', 'BRAND'],
      primaryRole: 'BRAND',
      hasBrandProfile: true,
      brandAccessRevoked: true,
    });

    expect(resolveImmediatePostAuthPath(user, '/brand/creators')).toBe(
      '/auth/continue?callbackUrl=%2Fbrand%2Fcreators',
    );
    expect(pathAfterWorkspaceSelection(user, 'BRAND', '/brand/creators')).toBe(
      '/creator/orders',
    );
  });

  it('can strip onboarding prompts for pure route navigation', () => {
    const user = createUser({
      roles: ['CREATOR', 'BRAND'],
      primaryRole: 'CREATOR',
      hasBrandProfile: true,
    });

    expect(stripOnboardingFromHref('/creator/orders?onboarding=creator')).toBe(
      '/creator/orders',
    );
    expect(
      pathAfterWorkspaceSelection(
        user,
        'CREATOR',
        '/creator/orders?onboarding=creator&tab=active',
        { promptIncompleteProfileOnboarding: false },
      ),
    ).toBe('/creator/orders?tab=active');
  });

  it('builds the continue route safely when there is no callback URL', () => {
    expect(postAuthContinuePath(null)).toBe('/auth/continue');
  });

  describe('creator onboarding (approval_first)', () => {
    it('sends pending creators to under-review before profile completion', () => {
      withOnboardingMode(undefined, () => {
        const user = createUser({
          creatorApprovalStatus: 'PENDING',
          creatorProfileComplete: false,
        });

        expect(resolveCreatorOnboardingPath(user)).toBe('/creator/under-review');
        expect(resolveImmediatePostAuthPath(user, null)).toBe('/creator/under-review');
        expect(resolvePostAuthRedirectPath(user, null)).toBe('/creator/under-review');
      });
    });

    it('sends approved but incomplete creators to profile settings', () => {
      withOnboardingMode(undefined, () => {
        const user = createUser({
          creatorApprovalStatus: 'APPROVED',
          creatorProfileComplete: false,
        });

        expect(resolveCreatorOnboardingPath(user)).toBe('/creator/settings/profile');
      });
    });
  });

  describe('creator onboarding (profile_first)', () => {
    it('sends pending incomplete creators to profile settings', () => {
      withOnboardingMode('profile_first', () => {
        const user = createUser({
          creatorApprovalStatus: 'PENDING',
          creatorProfileComplete: false,
        });

        expect(resolveCreatorOnboardingPath(user)).toBe('/creator/settings/profile');
        expect(resolveImmediatePostAuthPath(user, null)).toBe('/creator/settings/profile');
        expect(resolvePostAuthRedirectPath(user, null)).toBe('/creator/settings/profile');
      });
    });

    it('sends pending complete creators to under-review', () => {
      withOnboardingMode('profile_first', () => {
        const user = createUser({
          creatorApprovalStatus: 'PENDING',
          creatorProfileComplete: true,
        });

        expect(resolveCreatorOnboardingPath(user)).toBe('/creator/under-review');
        expect(resolveImmediatePostAuthPath(user, null)).toBe('/creator/under-review');
        expect(resolvePostAuthRedirectPath(user, null)).toBe('/creator/under-review');
      });
    });

    it('lets approved complete creators into the workspace', () => {
      withOnboardingMode('profile_first', () => {
        const user = createUser({
          creatorApprovalStatus: 'APPROVED',
          creatorProfileComplete: true,
        });

        expect(resolveCreatorOnboardingPath(user)).toBeNull();
        expect(resolveImmediatePostAuthPath(user, null)).toBe('/creator/account');
      });
    });
  });
});
