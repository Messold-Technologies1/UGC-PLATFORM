import { identifyPixelUser, splitFullName, trackPixelCustom } from "@/lib/meta-pixel";

/**
 * Event id shared by this browser event and the server's Conversions API copy,
 * so Meta counts the pair once. Derived from the brand profile, which both
 * sides know. Mirrors `brandRegistrationEventId` in
 * `server/src/meta-capi/meta-capi.service.ts` — keep the two in step.
 */
export function brandRegistrationEventId(brandProfileId: string): string {
  return `brand-registration-${brandProfileId}`;
}

/**
 * Report a brand signup conversion to the brand dataset, from the user's own
 * browser, at the moment the brand profile is created. Both signup routes call
 * this:
 *
 * - email + password → the role-choice step, where the server creates the
 *   profile straight away (that signup carries an OTP-verified phone, so the
 *   brand setup screen is skipped).
 * - Google → the /onboarding/brand setup screen, once the phone is verified.
 *
 * The server sends the same event with the same id, so an ad-blocked browser
 * still converts and a working one is not double-counted.
 *
 * Name, email and phone go out as Advanced Matching — normalized and SHA-256
 * hashed by the pixel SDK in the browser, so raw values are passed here and
 * never leave the page unhashed. `custom_data` deliberately carries no PII.
 *
 * Returns whether the event was dispatched, so a caller about to navigate away
 * can wait for the beacon (see {@link PIXEL_FLUSH_MS}).
 */
export function trackBrandRegistration(brand: {
  /** Drives the dedup id; omit only if the profile id isn't known. */
  brandProfileId?: string | null;
  email?: string | null;
  /** Full name; split into first/last for matching. */
  name?: string | null;
  /** E.164 phone (e.g. +919876543210). */
  phone?: string | null;
  /** Reporting/segmentation metadata — not a matching identifier. */
  brandName?: string | null;
  website?: string | null;
}): boolean {
  identifyPixelUser(
    {
      email: brand.email,
      ...splitFullName(brand.name),
      phone: brand.phone,
    },
    "brand",
  );
  return trackPixelCustom(
    "BrandRegistration",
    {
      ...(brand.brandName ? { brand_name: brand.brandName } : {}),
      ...(brand.website ? { website: brand.website } : {}),
    },
    {
      audience: "brand",
      ...(brand.brandProfileId
        ? { eventId: brandRegistrationEventId(brand.brandProfileId) }
        : {}),
    },
  );
}

/**
 * How long to hold a post-signup redirect open after firing a conversion. The
 * pixel sends its beacon asynchronously, and a hard `location.replace` can tear
 * the request down before it leaves the browser.
 */
export const PIXEL_FLUSH_MS = 300;
