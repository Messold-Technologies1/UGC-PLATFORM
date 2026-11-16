/**
 * The step every price on the platform sits on, converted or chosen.
 *
 * A creator pricing in rupees picks a multiple of 500, so a converted price
 * lands on the same grid: a brand browsing should not be able to tell which
 * creators typed rupees and which did not.
 *
 * The tradeoff is that a step this large can move a converted price by a
 * whole 500 on a rate move of well under a percent -- a package can sit at
 * 9,500 one morning and 9,000 the next. That is accepted as the cost of one
 * consistent price grid.
 */
export const PRICE_STEP_INR = 500;

/**
 * Round a converted rupee amount onto the price grid.
 *
 * Shared by the pricing form, the save path and the nightly refresh so all
 * three land on the same number for the same rate -- otherwise a package's
 * price would shift the first time the refresh touched it, for no reason
 * other than the three rounding independently.
 *
 * Never rounds below `step`, so a very small foreign amount cannot become a
 * free package.
 */
export function roundConvertedInr(
  inr: number,
  step: number = PRICE_STEP_INR,
): number {
  if (!Number.isFinite(inr) || inr <= 0) return 0;
  return Math.max(Math.round(inr / step) * step, step);
}
