import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { AuthUser } from "@/features/auth/hooks/use-me-query";
import { getMetaBrowserIds } from "@/lib/meta-pixel";

export type OnboardingRole = "CREATOR" | "BRAND";

/**
 * Post-signup role choice. Attaches the chosen workspace role to the current
 * (already-authenticated) account. CREATOR also provisions a creator profile
 * server-side; BRAND attaches the role only and the client then routes to the
 * brand setup screen. Returns the refreshed user.
 *
 * The Meta attribution cookies (`_fbp` / `_fbc`) are read here — in the user's
 * own browser, at the moment the profile is created — and stored on the creator
 * profile so the server can replay them on later Conversions API events (e.g.
 * CreatorProfileListed, fired when an admin approves the creator days later).
 */
export async function chooseWorkspaceRole(
  role: OnboardingRole,
): Promise<AuthUser> {
  const { fbp, fbc } = getMetaBrowserIds();
  const { data } = await api.post<{ user: AuthUser }>(
    ENDPOINTS.AUTH.ONBOARDING_ROLE,
    {
      role,
      ...(fbp ? { metaFbp: fbp } : {}),
      ...(fbc ? { metaFbc: fbc } : {}),
    },
  );
  return data.user;
}
