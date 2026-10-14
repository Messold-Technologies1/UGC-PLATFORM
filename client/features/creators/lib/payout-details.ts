/**
 * Shared validation rules for creator payout details (bank account / UPI).
 *
 * These mirror the server contract in
 * `server/src/creator-profile/dto/upsert-creator-payout-details.dto.ts` — keep
 * the two in sync so the client never sends something the API rejects (and
 * never blocks something the API accepts).
 */

/** Indian bank account numbers: 9–18 digits. */
export const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/;
/** RBI IFSC: 4 letters, a 0, then 6 alphanumerics (e.g. HDFC0001234). */
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** UPI VPA, e.g. name@okhdfcbank. */
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

export const ACCOUNT_HOLDER_MIN_CHARS = 3;
export const ACCOUNT_HOLDER_MAX_CHARS = 100;

/** Which payout rail a creator is configuring. */
export type PayoutMethod = "bank" | "upi";

export function validateAccountHolderName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return "Enter the account holder's full name.";
  if (name.length < ACCOUNT_HOLDER_MIN_CHARS)
    return `Name must be at least ${ACCOUNT_HOLDER_MIN_CHARS} characters.`;
  if (name.length > ACCOUNT_HOLDER_MAX_CHARS)
    return `Name must be under ${ACCOUNT_HOLDER_MAX_CHARS} characters.`;
  return undefined;
}

export function validateAccountNumber(value: string): string | undefined {
  const account = value.trim();
  if (!account) return "Enter your bank account number.";
  if (!ACCOUNT_NUMBER_REGEX.test(account))
    return "Account number must be 9–18 digits.";
  return undefined;
}

export function validateIfsc(value: string): string | undefined {
  const ifsc = value.trim().toUpperCase();
  if (!ifsc) return "Enter your branch IFSC code.";
  if (!IFSC_REGEX.test(ifsc))
    return "Enter a valid IFSC code (e.g. HDFC0001234).";
  return undefined;
}

export function validateUpiId(value: string): string | undefined {
  const upi = value.trim().toLowerCase();
  if (!upi) return "Enter your UPI ID.";
  if (!UPI_ID_REGEX.test(upi))
    return "Enter a valid UPI ID (e.g. yourname@okhdfcbank).";
  return undefined;
}

/** Normalizers applied before anything is sent to the API. */
export const normalizeIfsc = (value: string) => value.trim().toUpperCase();
export const normalizeUpiId = (value: string) => value.trim().toLowerCase();
/** Bank account numbers are digits only — strip anything a creator pastes in. */
export const normalizeAccountNumber = (value: string) =>
  value.replace(/\D/g, "").slice(0, 18);
