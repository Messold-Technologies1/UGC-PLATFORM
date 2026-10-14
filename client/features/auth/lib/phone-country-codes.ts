import { Country } from "country-state-city";

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

export function buildE164Phone(dialCode: string, nationalDigits: string): string {
  const national = nationalDigits.replace(/\D/g, "");
  if (!national) return "";
  return `+${dialCode}${national}`;
}

/** Max national digits so the full E.164 stays within 15 digits. */
export function maxNationalDigits(dialCode: string): number {
  return Math.max(4, 15 - dialCode.length);
}

export const PHONE_E164_REGEX = /^\+\d{8,15}$/;
