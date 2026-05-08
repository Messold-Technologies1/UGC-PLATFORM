import {
  pathAfterWorkspaceSelection,
  postAuthContinuePath,
  resolvePostAuthRedirectPath,
  stripOnboardingFromHref,
} from '../../../client/features/auth/lib/post-auth-destination';
import { resolveImmediatePostAuthPath } from '../../../client/features/auth/lib/resolve-immediate-post-auth-path';
import type { AuthUser } from '../../../client/features/auth/hooks/use-me-query';

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
});
