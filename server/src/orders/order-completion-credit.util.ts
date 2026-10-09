/**
 * Order-completion reward credit: how much (if anything) a brand earns when an
 * order completes successfully.
 *
 * Pure and env-driven so the amount and the on/off switch are an environment
 * change plus a restart — never a code change — and so the eligibility rules are
 * unit-testable without a database or a Nest container.
 *
 * The reward is non-withdrawable store credit (see WalletService's promo
 * bucket): the brand can spend it on a new order, but can never take it out as
 * money.
 */

export type OrderCompletionCreditEnv = {
  /** ORDER_COMPLETION_CREDIT_ENABLED: 'true' switches the reward on. */
  enabled: string | undefined;
  /** ORDER_COMPLETION_CREDIT_PAISE: reward amount in paise (5000 = ₹50). */
  amountPaise: string | number | undefined;
};

export type OrderCompletionCreditOrder = {
  brandId: string | null;
  agencyId: string | null;
  /** What the brand settled for the order, in paise. */
  expectedAmountPaise: number;
  /** True for a creator "first order free" order — the brand paid nothing. */
  isFreeOrder: boolean;
};

/**
 * The reward due for this order, in paise; 0 when no reward is due.
 *
 * A ₹0 order earns nothing: a free order that minted spendable credit would be
 * a money printer. An order with no brand or agency owner has no wallet to
 * credit.
 */
export function resolveOrderCompletionCreditPaise(
  env: OrderCompletionCreditEnv,
  order: OrderCompletionCreditOrder,
): number {
  if (env.enabled?.trim() !== 'true') return 0;

  const amountPaise =
    typeof env.amountPaise === 'number'
      ? env.amountPaise
      : Number(env.amountPaise ?? NaN);
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return 0;

  if (!order.brandId && !order.agencyId) return 0;
  if (order.isFreeOrder || order.expectedAmountPaise <= 0) return 0;

  return amountPaise;
}
