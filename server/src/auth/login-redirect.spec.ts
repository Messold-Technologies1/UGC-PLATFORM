import {
  buildLoginHref,
  inferLoginRoleFromPath,
  normalizeCallbackPath,
} from '../../../client/features/auth/lib/login-redirect';

describe('login-redirect helpers', () => {
  it('normalizes full callback URLs to internal paths', () => {
    expect(
      normalizeCallbackPath('https://test.gocollab.io/creator/account'),
    ).toBe('/creator/account');
  });

  it('infers creator role from creator paths', () => {
    expect(inferLoginRoleFromPath('/creator/account')).toBe('creator');
    expect(
      inferLoginRoleFromPath('https://test.gocollab.io/creator/settings/profile'),
    ).toBe('creator');
  });

  it('builds login href with role and callback', () => {
    expect(buildLoginHref('/creator/account')).toBe(
      '/login?callbackUrl=%2Fcreator%2Faccount&role=creator',
    );
  });
});
