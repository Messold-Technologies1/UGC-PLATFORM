import { Country } from "country-state-city";

/**
 * Pricing in a creator's own currency.
 *
 * Rupees stay canonical — the server converts on save and stores ₹ in
 * `priceAmount`. This is what the form needs to show the same number back
 * before they commit to it.
 */

/** Packages are priced in multiples of this, in rupees. Mirrors the server. */
export const PRICE_STEP = 500;

/** ISO currency for a country name as the location step stores it. */
export function currencyForCountry(
  countryName: string | null | undefined,
): string | null {
  const name = countryName?.trim();
  if (!name) return null;
  const match = Country.getAllCountries().find(
    (country) => country.name.toLowerCase() === name.toLowerCase(),
  );
  return match?.currency?.toUpperCase() ?? null;
}

/** True once we know the creator is somewhere that does not pay in rupees. */
export function needsPriceConversion(
  countryName: string | null | undefined,
): boolean {
  const currency = currencyForCountry(countryName);
  return Boolean(currency) && currency !== "INR";
}

/**
 * Rupees for `amount` of a currency, given rates expressed as units per 1 INR.
 *
 * Returns null when that currency is not in the table — the upstream carries
 * the ECB set only, so PKR, AED and the Gulf are missing and the form has to
 * fall back to asking for rupees.
 */
export function convertToInr(
  amount: number,
  currency: string,
  ratesPerInr: Record<string, number>,
): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const code = currency.trim().toUpperCase();
  if (code === "INR") return amount;
  const perInr = ratesPerInr[code];
  if (!perInr || perInr <= 0) return null;
  return amount / perInr;
}

/**
 * Snap rupees onto the price grid, the way the server does on save, so the
 * figure shown before saving is the figure stored.
 *
 * Converted prices land on this same grid -- the server rounds them with the
 * same step -- so a brand browsing cannot tell which creators typed rupees.
 */
export function snapToPriceStep(inr: number): number {
  return Math.max(Math.round(inr / PRICE_STEP) * PRICE_STEP, PRICE_STEP);
}
