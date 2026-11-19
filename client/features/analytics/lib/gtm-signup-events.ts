/**
 * Signup conversions pushed to the Google Tag Manager `dataLayer`.
 *
 * Deliberately separate from `features/auth/lib/track-signup-events.ts`, which
 * reports the same moment to Meta. The two are fired side by side at each call
 * site and neither depends on the other, so one being blocked never costs the
 * other its event — the same arrangement `gtm-ecommerce.ts` has with
 * `lib/meta-pixel.ts`.
 *
 * Everything here is a no-op when `window.dataLayer` is missing — GTM blocked
 * by an extension, or any server render — so callers never have to guard.
 */

/**
 * Brand registration is complete: the brand profile now exists.
 *
 * Fired from BOTH signup routes, which complete at different moments:
 *
 * - **email + password** → the role-choice step ("Continue as Brand"), where
 *   the server creates the profile straight away because that signup carries
 *   an OTP-verified phone.
 * - **Google** → the brand setup dialog, which is where a Google user first
 *   supplies the phone and brand details. At role choice a Google brand has no
 *   profile yet, so firing there would report a registration that has not
 *   happened.
 *
 * `transaction_id` is what Google Ads deduplicates on, and it carries the
 * internal user id rather than the brand profile id: a user is the thing that
 * registers once, and it is the id both routes can supply without a second
 * lookup.
 *
 * Returns whether it was pushed, so a caller about to navigate away can hold
 * the redirect open long enough for GTM's own tags to fire.
 */
export function pushBrandRegistrationComplete(params: {
  /** Internal user id — becomes both `user_id` and `transaction_id`. */
  userId: string;
}): boolean {
  if (typeof window === "undefined") return false;
  const dataLayer = window.dataLayer;
  if (!Array.isArray(dataLayer)) return false;
  if (!params.userId) return false;

  try {
    dataLayer.push({
      event: "brand_registration_complete",
      user_role: "brand",
      user_id: params.userId,
      // Google Ads dedupes on this, so it must be stable across retries and
      // identical to `user_id`.
      transaction_id: params.userId,
    });
    return true;
  } catch {
    return false;
  }
}
