export const SITE_NAME = "Go Collab";
export const SITE_DESCRIPTION =
  "Where brands and creators collaborate on authentic content.";

/**
 * Canonical origin, no trailing slash.
 *
 * Structured data has to agree with the canonical URL Google resolves the
 * site to, so this reads the same env var as `metadataBase` in the root
 * layout rather than hardcoding a host. Set `NEXT_PUBLIC_SITE_URL` to
 * whichever of www/non-www the site actually serves.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.gocollab.io"
).replace(/\/+$/, "");
