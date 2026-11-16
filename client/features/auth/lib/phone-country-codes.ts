import { Country } from "country-state-city";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export type PhoneCountryOption = {
  isoCode: string;
  name: string;
  flag: string;
  /** Digits only, no leading `+`. */
  dialCode: string;
};

/** When several countries share a dial code, prefer these ISO picks. */
const PREFERRED_ISO_FOR_DIAL: Record<string, string> = {
  "1": "US",
  "7": "RU",
  "44": "GB",
  "61": "AU",
  "91": "IN",
};

function sanitizeDialCode(phonecode: string): string {
  return phonecode.replace(/\D/g, "");
}

let cachedOptions: PhoneCountryOption[] | null = null;

/** All countries with a usable dial code, India first then A–Z by name. */
export function getPhoneCountryOptions(): PhoneCountryOption[] {
  if (cachedOptions) return cachedOptions;

  const options = Country.getAllCountries()
    .map((country) => ({
      isoCode: country.isoCode,
      name: country.name,
      flag: country.flag,
      dialCode: sanitizeDialCode(country.phonecode),
    }))
    .filter((option) => option.dialCode.length > 0);

  options.sort((a, b) => {
    if (a.isoCode === "IN") return -1;
    if (b.isoCode === "IN") return 1;
    return a.name.localeCompare(b.name);
  });

  cachedOptions = options;
  return options;
}

export function findPhoneCountryByIso(
  isoCode: string,
  options: PhoneCountryOption[] = getPhoneCountryOptions(),
): PhoneCountryOption | undefined {
  return options.find((option) => option.isoCode === isoCode);
}

/**
 * Split an E.164 number into country option + national digits. Uses the longest
 * matching dial code; ties break via {@link PREFERRED_ISO_FOR_DIAL}.
 */
export function splitE164Phone(
  e164: string,
  options: PhoneCountryOption[] = getPhoneCountryOptions(),
): { option: PhoneCountryOption; national: string } | null {
  const digits = e164.replace(/\D/g, "");
  if (!digits) return null;

  const byLength = [...options].sort(
    (a, b) => b.dialCode.length - a.dialCode.length,
  );

  let best: PhoneCountryOption | null = null;
  for (const option of byLength) {
    if (!digits.startsWith(option.dialCode)) continue;
    if (!best || option.dialCode.length > best.dialCode.length) {
      best = option;
      continue;
    }
    if (option.dialCode.length === best.dialCode.length) {
      const preferred = PREFERRED_ISO_FOR_DIAL[option.dialCode];
      if (preferred && option.isoCode === preferred) best = option;
    }
  }

  if (!best) return null;
  return {
    option: best,
    national: digits.slice(best.dialCode.length),
  };
}

/**
 * Canonical E.164 for `raw`, or `null` when it is not a real, dialable number.
 *
 * Mirrors `normalizeE164` on the server (server/src/common/phone). The server
 * is the authority — this copy exists so the form can disable "Send OTP" and
 * explain the problem before spending a round trip (and a WhatsApp message) on
 * a number that will be rejected.
 */
export function normalizeE164Phone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("+")) return null;
  try {
    const parsed = parsePhoneNumberFromString(trimmed);
    return parsed?.isValid() ? parsed.number : null;
  } catch {
    return null;
  }
}

/** True when `raw` is a real number we can dial. */
export function isValidE164Phone(raw: string): boolean {
  return normalizeE164Phone(raw) !== null;
}

/**
 * Assemble the E.164 value to submit from the country picker and the national
 * box.
 *
 * Canonicalizing here is what keeps the national trunk prefix out of the
 * database. Indian numbers are printed as `08122064860`, so that is what gets
 * typed into a box labelled "Phone number"; concatenating it with the dial
 * code produced `+9108122064860`, which only looked E.164 because it had the
 * right number of digits. libphonenumber recognises the trunk `0` and hands
 * back `+918122064860`.
 *
 * A number still being typed has no canonical form yet, so the plain
 * concatenation is returned until it parses. Validity is reported separately
 * by {@link isValidE164Phone} rather than by emptying this value, so the field
 * keeps showing what the user is typing.
 */
export function buildE164Phone(dialCode: string, nationalDigits: string): string {
  const national = nationalDigits.replace(/\D/g, "");
  if (!national) return "";
  const joined = `+${dialCode}${national}`;
  return normalizeE164Phone(joined) ?? joined;
}

/**
 * Max national digits accepted by the input.
 *
 * This is only a cap on typing — it keeps the value inside E.164's 15-digit
 * ceiling and cannot tell a valid length from an invalid one (India's limit
 * computes to 13 here, against a real national length of 10). Correctness is
 * {@link isValidE164Phone}'s job.
 */
export function maxNationalDigits(dialCode: string): number {
  return Math.max(4, 15 - dialCode.length);
}
