function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function normalizeCookieDomain(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

export type CreatorOnboardingMode = "approval_first" | "profile_first";

function readCreatorOnboardingMode(): CreatorOnboardingMode {
  const raw =
    process.env.NEXT_PUBLIC_CREATOR_ONBOARDING_MODE ??
    process.env.CREATOR_ONBOARDING_MODE;
  return raw === "profile_first" ? "profile_first" : "approval_first";
}

const apiUrl = normalizeBaseUrl(
  process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000",
);

export const env = {
  apiUrl,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  authCookieName: process.env.AUTH_COOKIE_NAME || "accessToken",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "refreshToken",
  socketUrl: normalizeBaseUrl(
    process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:4000",
  ),
  cookieDomain: normalizeCookieDomain(
    process.env.COOKIE_DOMAIN || process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  ),
  spotlightContactEmail:
    process.env.NEXT_PUBLIC_SPOTLIGHT_CONTACT_EMAIL?.trim() ||
    "hello@gocollab.io",
  /**
   * Meta (Facebook) Pixel ID. When empty the base pixel never loads and every
   * browser tracking call becomes a silent no-op — the client-side kill switch
   * for Meta tracking. Set NEXT_PUBLIC_META_PIXEL_ID to enable.
   */
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "",
  /**
   * Microsoft Clarity project ID. When empty the Clarity SDK never initializes
   * and every clarity call becomes a silent no-op — the client-side kill switch
   * for Clarity. Set NEXT_PUBLIC_CLARITY_PROJECT_ID to enable (e.g. xk7yl8ttic).
   */
  clarityProjectId: process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() || "",
  get creatorOnboardingMode(): CreatorOnboardingMode {
    return readCreatorOnboardingMode();
  },
} as const;

/** Absolute API URL for paths like `/api/auth/login` (OAuth redirects, etc.). */
export function resolveApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiUrl}${normalizedPath}`;
}
