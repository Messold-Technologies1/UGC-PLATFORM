/**
 * Converted rupee prices are rounded to this, not to the ?500 price step.
 *
 * That step is the grid a creator picks a price on, and rounding a conversion
 * to it would amplify rate noise into the shop window: a 1% move on a ?9,346
 * price would visibly jump it between ?9,000 and ?9,500. ?100 keeps the
 * number looking chosen rather than computed, while a small rate move usually
 * shifts it by ?100 or not at all.
 */
export const CONVERTED_PRICE_ROUNDING = 100;

/**
 * Round a converted rupee amount to a tidy figure.
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
  step: number = CONVERTED_PRICE_ROUNDING,
): number {
  if (!Number.isFinite(inr) || inr <= 0) return 0;
  return Math.max(Math.round(inr / step) * step, step);
}
