/**
 * What it means for a brand profile to be "complete", and the phone-verification
 * primitives that answer it.
 *
 * Completeness had no server-side definition before this: the create DTO marks
 * only `contactFullName` as required (not even `brandName`), and the update DTO
 * is optional throughout. This file defines it, for one purpose — a brand may
 * only ask an agency to manage its account once the account is real. Handing
 * over the workspace is the right moment to insist, because from then on a
 * creator sees this brand's name on every order and brief the agency places.
 *
 * The bar is deliberately low: identity a creator will actually see, plus proof
 * that a verified human holds the account. Everything else a brand can fill in
 * later, and demanding more would lock out existing brands for no added safety.
 */

/** Each distinct reason a profile is not yet complete. */
export type BrandCompletenessGap =
  | 'BRAND_NAME_MISSING'
  | 'CONTACT_NAME_MISSING'
  | 'CONTACT_PHONE_MISSING'
  | 'PHONE_NOT_VERIFIED';

export type BrandCompletenessProfile = {
  brandName?: string | null;
  contactFullName?: string | null;
  contactPhone?: string | null;
};

export type BrandCompletenessUser = {
  phone?: string | null;
  phoneVerified?: boolean | null;
  phoneOtpLastStatus?: string | null;
};

export type BrandCompletenessResult = {
  complete: boolean;
  gaps: BrandCompletenessGap[];
};

/**
 * Compare phone numbers the way a human would: ignoring the spacing. Shared so
 * the display flag and any future caller cannot drift to different notions of
 * "the same number".
 */
export function normalizePhone(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const stripped = String(value).replace(/\s/g, '');
  return stripped.length > 0 ? stripped : null;
}

/** True when both numbers are present and are the same number. */
export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  return left !== null && right !== null && left === right;
}

/**
 * Has the account owner passed phone OTP?
 *
 * Both halves matter. `phoneVerified` can be set by a path that later fails,
 * and `phoneOtpLastStatus` records the provider's own verdict, so the pair
 * together is what the rest of the codebase already treats as "OTP approved".
 */
export function ownerPhoneVerified(user: BrandCompletenessUser): boolean {
  return Boolean(user.phoneVerified) && user.phoneOtpLastStatus === 'approved';
}

function isBlank(value: string | null | undefined): boolean {
  return !value || String(value).trim().length === 0;
}

/**
 * Is this brand profile complete enough to hand an agency the keys?
 *
 * Required: `brandName`, `contactFullName`, `contactPhone`, and a verified
 * owner phone.
 *
 * Deliberately NOT required:
 * - the logo — a product decision;
 * - `contactEmail` — outbound mail falls back to the account email, and
 *   `User.email` is non-nullable, so a contactable address always exists;
 * - website, Instagram, product type, categories, pronunciation audio — these
 *   describe and help match the brand, they do not identify it.
 *
 * Two details stop this from locking people out:
 *
 * 1. `contactPhone` does NOT have to equal the login phone. `mapBrandProfile`'s
 *    display flag demands that equality, but nothing in the product can OTP a
 *    number other than the login phone — so requiring it here would permanently
 *    block any brand whose business line differs from the number they signed up
 *    with. What actually matters is that a verified human owns the account.
 *
 * 2. `otpRequired` false skips the OTP rule entirely. With PHONE_OTP_ENABLED
 *    off, signup writes `phoneVerified: false` for everyone, so an
 *    unconditional check would block every brand in that environment, staging
 *    included.
 *
 * Returns every gap rather than the first, so one round trip tells the caller
 * the whole list and the UI can show it at once.
 */
export function brandProfileCompleteness(params: {
  profile: BrandCompletenessProfile;
  user: BrandCompletenessUser;
  otpRequired: boolean;
}): BrandCompletenessResult {
  const gaps: BrandCompletenessGap[] = [];

  if (isBlank(params.profile.brandName)) gaps.push('BRAND_NAME_MISSING');
  if (isBlank(params.profile.contactFullName))
    gaps.push('CONTACT_NAME_MISSING');
  if (isBlank(params.profile.contactPhone)) gaps.push('CONTACT_PHONE_MISSING');

  if (params.otpRequired && !ownerPhoneVerified(params.user)) {
    gaps.push('PHONE_NOT_VERIFIED');
  }

  return { complete: gaps.length === 0, gaps };
}

/** Human-readable reason per gap, for API errors and the client's field hints. */
export const BRAND_COMPLETENESS_GAP_MESSAGES: Record<
  BrandCompletenessGap,
  string
> = {
  BRAND_NAME_MISSING: 'Add your brand name',
  CONTACT_NAME_MISSING: 'Add a contact name',
  CONTACT_PHONE_MISSING: 'Add a contact phone number',
  PHONE_NOT_VERIFIED: 'Verify your phone number',
};
