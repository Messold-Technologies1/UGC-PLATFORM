export const env = {
  apiUrl:
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:5000",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ugcplatform.com",
  authCookieName: process.env.AUTH_COOKIE_NAME || "token",
} as const;
