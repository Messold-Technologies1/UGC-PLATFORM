import type { ConfigService } from '@nestjs/config';

/**
 * Shared helpers for building links into the frontend app from the same
 * `FRONTEND_URL` base the mail notifiers use. Keeping this in one place means
 * email CTAs and WhatsApp button URLs always point at the same routes.
 */

/** The frontend origin, trailing slash stripped (e.g. `https://app.gocollab.io`). */
export function frontendBaseUrl(config: ConfigService): string {
  return (config.get<string>('FRONTEND_URL') ?? '').replace(/\/$/, '');
}

/**
 * The path portion of a full frontend URL, relative to the origin and without a
 * leading slash (e.g. `https://app.gocollab.io/creator/orders/123/brief`
 * -> `creator/orders/123/brief`).
 *
 * WhatsApp dynamic-URL buttons only let the value vary as a suffix appended to a
 * fixed base. By approving a single template whose button base is
 * `${FRONTEND_URL}/{{1}}` and passing this relative path as `{{1}}`, one
 * template can deep-link anywhere the emails already link to.
 */
export function frontendRelativePath(base: string, fullUrl: string): string {
  const prefix = `${base}/`;
  if (fullUrl.startsWith(prefix)) return fullUrl.slice(prefix.length);
  // Fallback: strip scheme + host if the base didn't match (e.g. env drift).
  return fullUrl.replace(/^https?:\/\/[^/]+\/?/, '');
}
