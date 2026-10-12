/**
 * Signup welcome credit: how much (if anything) a newly registered buyer earns.
 * One rule for both buyer types — a brand and an agency are rewarded on
 * identical terms from the same two settings, so switching it off switches it
 * off for both.
 *
 * Pure and env-driven, like the order-completion reward it sits beside, so the
 * amount and the on/off switch are an environment change plus a restart — never
 * a code change — and the rules are testable without a database or a Nest
 * container. The two rewards share no configuration: either can be switched on,
 * off or re-priced without touching the other.
 *
 * The grant is non-withdrawable store credit (WalletService's promo bucket).
 * That is not a detail: a welcome bonus that could be withdrawn would pay out
 * real money to anyone who registers an account.
 */

export type SignupWelcomeCreditEnv = {
  /** SIGNUP_WELCOME_CREDIT_ENABLED: 'true' switches the welcome credit on, for
   *  brands and agencies alike. */
  enabled: string | undefined;
  /** SIGNUP_WELCOME_CREDIT_PAISE: welcome amount in paise (10000 = ₹100). */
  amountPaise: string | number | undefined;
};

/** The welcome credit due, in paise; 0 when none is due. */
export function resolveSignupWelcomeCreditPaise(
  env: SignupWelcomeCreditEnv,
): number {
  if (env.enabled?.trim() !== 'true') return 0;

  const amountPaise =
    typeof env.amountPaise === 'number'
      ? env.amountPaise
      : Number(env.amountPaise ?? NaN);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return 0;

  return amountPaise;
}
