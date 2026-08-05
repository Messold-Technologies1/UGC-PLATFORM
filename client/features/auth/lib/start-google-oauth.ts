import { resolveApiUrl } from "@/lib/env";
import { ENDPOINTS } from "@/lib/endpoints";

export type GoogleOAuthRole = "BRAND" | "CREATOR";

/**
 * Starts Google OAuth via the API redirect. Optionally scopes the intended
 * workspace role so the callback can provision brand/creator onboarding.
 */
export function startGoogleOAuth(options?: {
  role?: GoogleOAuthRole;
  callbackUrl?: string | null;
}): void {
  const params = new URLSearchParams();
  if (options?.role) {
    params.set("role", options.role);
  }
  // callbackUrl is handled client-side after /auth/callback via localStorage
  // so the OAuth round-trip does not need to carry it through Google.
  if (options?.callbackUrl?.trim()) {
    try {
      sessionStorage.setItem(
        "gocollab.oauth.callbackUrl",
        options.callbackUrl.trim(),
      );
    } catch {
      // ignore storage failures
    }
  }
  const qs = params.toString();
  const googleAuthPath = ENDPOINTS.AUTH.GOOGLE;
  window.location.href = qs
    ? `${resolveApiUrl(googleAuthPath)}?${qs}`
    : resolveApiUrl(googleAuthPath);
}

export function consumeOAuthCallbackUrl(): string | null {
  try {
    const value = sessionStorage.getItem("gocollab.oauth.callbackUrl");
    sessionStorage.removeItem("gocollab.oauth.callbackUrl");
    return value;
  } catch {
    return null;
  }
}
