import type { CookieOptions } from 'express';
import type { Response } from 'express';
import { AUTH_COOKIE_NAMES } from './auth.service';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Parent domain for auth cookies (e.g. `.gocollab.io`) so tokens are sent to both
 * the frontend host and the API/WebSocket host. Set via COOKIE_DOMAIN in production.
 */
function getAuthCookieDomain(): string | undefined {
  const raw = process.env.COOKIE_DOMAIN?.trim();
  if (!raw) return undefined;
  return raw.startsWith('.') ? raw : `.${raw}`;
}

function getAuthCookieBaseOptions(): CookieOptions {
  const domain = getAuthCookieDomain();
  const sameSite = isProduction ? ('none' as const) : ('lax' as const);
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    path: '/',
    ...(domain ? { domain } : {}),
  };
}

/** Set access and refresh token cookies. Expiry can be e.g. "15m" or "7d". */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessExpiry: string,
  refreshExpiry: string,
): void {
  const baseOptions = getAuthCookieBaseOptions();

  res.cookie(AUTH_COOKIE_NAMES.accessToken, accessToken, {
    ...baseOptions,
    maxAge: expiryToSeconds(accessExpiry) * 1000,
  });
  res.cookie(AUTH_COOKIE_NAMES.refreshToken, refreshToken, {
    ...baseOptions,
    maxAge: expiryToSeconds(refreshExpiry) * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const clearOptions: CookieOptions = {
    ...getAuthCookieBaseOptions(),
    maxAge: 0,
  };
  res.cookie(AUTH_COOKIE_NAMES.accessToken, '', clearOptions);
  res.cookie(AUTH_COOKIE_NAMES.refreshToken, '', clearOptions);
}

/** Parse expiry string like 15m, 7d into approximate seconds */
export function expiryToSeconds(expiry: string): number {
  const match = /^(\d+)([mhds])$/.exec(expiry);
  if (!match) return 15 * 60; // default 15 min
  const n = Number.parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 15 * 60;
  }
}

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_ROLE_COOKIE = 'oauth_role';

export type OAuthIntendedRole = 'BRAND' | 'CREATOR';

export function setOAuthStateCookie(res: Response, state: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 10 * 60 * 1000, // 10 min
  });
}

export function setOAuthRoleCookie(
  res: Response,
  role: OAuthIntendedRole,
): void {
  res.cookie(OAUTH_ROLE_COOKIE, role, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 10 * 60 * 1000,
  });
}

export function clearOAuthStateCookie(res: Response): void {
  res.cookie(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
  res.cookie(OAUTH_ROLE_COOKIE, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 0,
  });
}

export function parseOAuthIntendedRole(
  value: string | undefined,
): OAuthIntendedRole | null {
  if (value === 'BRAND' || value === 'CREATOR') return value;
  return null;
}
