/**
 * Feature-flag readers.
 *
 * Pure functions over the raw env string so they can be imported anywhere —
 * including by the global brand-access layer — without dragging in a Nest
 * module and creating a dependency cycle.
 */

/**
 * AGENCY_BRAND_PARTNER_LINKS_ENABLED — the agency↔brand partner link.
 *
 * Opt-in: anything other than the exact string 'true' leaves it off. The
 * opposite default would be dangerous here, because this flag gates who may act
 * inside another account's workspace and spend its credits; a typo or a missing
 * variable must fail closed, not open.
 */
export function agencyBrandPartnerLinksEnabled(
  raw: string | undefined | null,
): boolean {
  return raw?.trim() === 'true';
}

/**
 * PHONE_OTP_ENABLED — whether phone verification is demanded anywhere.
 *
 * Opt-OUT, unlike the flag above: only the explicit string 'false' disables it,
 * so a missing variable still requires OTP. That asymmetry is deliberate and
 * predates this file; it is the behaviour `PhoneVerificationService.otpRequired()`
 * has always had, and weakening verification by omission would be the dangerous
 * default here.
 *
 * Lives here so callers that must not depend on the OTP-sending stack — the
 * partner-link gate, for one — can ask the same question as the service itself,
 * without a second copy of the rule drifting out of step.
 */
export function phoneOtpRequired(raw: string | undefined | null): boolean {
  return raw !== 'false';
}
