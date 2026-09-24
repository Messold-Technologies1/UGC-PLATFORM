import {
  identifyPixelUser,
  splitFullName,
  trackPixelCustom,
} from "@/lib/meta-pixel";

/**
 * The identity we can attach to a signup conversion. Name/email/phone are the
 * Advanced Matching keys Meta uses to match the event to a person — they are
 * normalized and SHA-256 hashed by the pixel SDK in the browser, so raw values
 * are passed here and never leave the page unhashed.
 */
export type SignupIdentity = {
  email?: string | null;
  /** Full name; split into first/last for matching. */
  name?: string | null;
  /** E.164 phone (e.g. +919876543210). */
  phone?: string | null;
};

/**
 * Meta signup conversions, one helper per audience so every call site reports
 * the same shape to the same dataset.
 *
 * Both fire from the user's own browser at the moment their account becomes
 * usable, and both cover the Google and email+password signup routes:
 *
 * - creator → the role-choice step, which is where a creator profile is
 *   created for either route.
 * - brand → the role-choice step when the brand profile is created there
 *   (email+password signup carries an OTP-verified phone, so setup is skipped),
 *   otherwise the /onboarding/brand setup screen (the Google route).
 *
 * `custom_data` deliberately carries no PII — identifiers travel through
 * Advanced Matching, which is hashed. Each helper returns whether the event was
 * dispatched, so a caller about to navigate away can wait for the beacon
 * (see {@link PIXEL_FLUSH_MS}).
 */
export function trackCreatorRegistration(identity: SignupIdentity): boolean {
  identifyPixelUser(
    {
      email: identity.email,
      ...splitFullName(identity.name),
      phone: identity.phone,
    },
    "creator",
  );
  return trackPixelCustom("CreatorRegistration", undefined, {
    audience: "creator",
  });
}

export function trackBrandRegistration(
  identity: SignupIdentity & {
    /** Reporting/segmentation metadata — not a matching identifier. */
    brandName?: string | null;
    website?: string | null;
  },
): boolean {
  identifyPixelUser(
    {
      email: identity.email,
      ...splitFullName(identity.name),
      phone: identity.phone,
    },
    "brand",
  );
  return trackPixelCustom(
    "BrandRegistration",
    {
      ...(identity.brandName ? { brand_name: identity.brandName } : {}),
      ...(identity.website ? { website: identity.website } : {}),
    },
    { audience: "brand" },
  );
}

/**
 * How long to hold a post-signup redirect open after firing a conversion. The
 * pixel sends its beacon asynchronously, and a hard `location.replace` can tear
 * the request down before it leaves the browser.
 */
export const PIXEL_FLUSH_MS = 300;
