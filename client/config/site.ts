export const SITE_NAME = "Go Collab";
export const SITE_DESCRIPTION =
  "Where brands and creators collaborate on authentic content.";

/**
 * Canonical origin, no trailing slash.
 *
 * Hardcoded on purpose. This used to be read from `NEXT_PUBLIC_SITE_URL` in
 * four places with three different fallbacks — `https://collabry.com` in
 * robots.ts and sitemap.ts, `https://gocollab.io` in the root layout and
 * `http://localhost:3000` in lib/env.ts — and that variable is not set for
 * the frontend. Unset, the sitemap advertised a domain the product does not
 * use and creators were handed `http://localhost:3000/<slug>` as their
 * shareable profile link.
 *
 * The site serves non-www, so every canonical URL, sitemap entry and
 * structured-data graph is built from this one value.
 */
export const SITE_URL = "https://gocollab.io";
