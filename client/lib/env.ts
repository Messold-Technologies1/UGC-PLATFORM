export const env = {
  apiUrl:
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  /** Access JWT cookie; must match server `AUTH_COOKIE_NAMES.accessToken`. */
  authCookieName: process.env.AUTH_COOKIE_NAME || "accessToken",
} as const;
