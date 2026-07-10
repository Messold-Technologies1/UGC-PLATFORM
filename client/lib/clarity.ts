import Clarity from "@microsoft/clarity";
import { env } from "@/lib/env";

/**
 * Thin, self-contained wrapper around the Microsoft Clarity SDK
 * (`@microsoft/clarity`).
 *
 * Everything here is a no-op when {@link env.clarityProjectId} is empty, so
 * callers never have to guard. Removal later is just: delete this file, the
 * `<ClarityInit />` / `<ClarityUserSync />` mounts in `app/layout.tsx`, the
 * `components/clarity.tsx` component, and the handful of `data-clarity-mask`
 * attributes.
 *
 * The SDK is initialized in `components/clarity.tsx`; this module only exposes
 * the `identify` helper and the masking attribute used across sensitive UI.
 */

/** True only in the browser once a Clarity project ID is configured. */
function clarityEnabled(): boolean {
  return typeof window !== "undefined" && Boolean(env.clarityProjectId);
}

/**
 * Spread onto any element wrapping sensitive content (chat, payment, profile
 * PII) to force Clarity to mask it in session recordings and heatmaps,
 * regardless of the project's dashboard masking mode.
 *
 * Usage: `<div {...CLARITY_MASK}>…</div>`
 */
export const CLARITY_MASK = { "data-clarity-mask": "true" } as const;

/**
 * Link the current Clarity session to a stable, non-PII user identifier so
 * sessions can be grouped per user. Pass the opaque user id (never an email or
 * other PII). `friendlyName` surfaces the role in the Clarity dashboard.
 *
 * No-op when Clarity isn't enabled.
 */
export function identifyClarityUser(
  userId: string,
  role?: string | null,
): void {
  if (!clarityEnabled() || !userId) return;
  try {
    // identify(customId, customSessionId?, customPageId?, friendlyName?)
    Clarity.identify(userId, undefined, undefined, role ?? undefined);
    if (role) Clarity.setTag("role", role);
  } catch {
    // Clarity not ready yet — safe to ignore.
  }
}
