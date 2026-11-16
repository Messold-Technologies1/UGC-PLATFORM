import { Transform } from 'class-transformer';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Phone numbers, parsed properly.
 *
 * The old check was `/^\+\d{8,15}$/`, which only counts digits. It happily
 * accepted `+9108122064860` — India's dial code `91` followed by the national
 * trunk prefix `0` that every Indian number is printed with — because that is
 * 13 digits and therefore "E.164 shaped". It is not a number: `+910` is not a
 * country.
 *
 * Such a number still reaches its owner on WhatsApp, because Meta's Cloud API
 * resolves the string against registered accounts and drops the trunk prefix
 * while doing so. That is why these got OTP-verified: a real person really did
 * receive the code and type it back. What was stored afterwards was still
 * junk — Twilio's SMS fallback rejects it outright, and the same human can be
 * stored twice (with and without the `0`), which also resets the per-number OTP
 * send caps since those are keyed on the string.
 *
 * So: parse against the real libphonenumber metadata and persist the canonical
 * form it returns.
 */

export const E164_VALIDATION_MESSAGE =
  'phone must be a valid number in E.164 format, including the country code (e.g. +919876543210)';

/**
 * Canonical E.164 for `raw`, or `null` if it is not a real, dialable number.
 *
 * Input must be international (leading `+`): a bare national string cannot be
 * resolved without knowing which country it belongs to, and guessing a default
 * is how numbers end up attributed to the wrong one.
 *
 * Note this *repairs* as well as validates. libphonenumber recognises a
 * national trunk prefix sitting after the country code, so `+9108122064860`
 * parses as valid and comes back as `+918122064860`. Existing creators who
 * typed their number that way keep working, and the value that reaches the
 * database is correct from here on.
 */
export function normalizeE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('+')) return null;

  let parsed: ReturnType<typeof parsePhoneNumberFromString>;
  try {
    parsed = parsePhoneNumberFromString(trimmed);
  } catch {
    // Malformed input throws rather than returning undefined on some paths.
    return null;
  }
  if (!parsed?.isValid()) return null;
  return parsed.number;
}

/** True when `raw` is a real number we can dial. */
export function isValidE164(raw: unknown): boolean {
  return normalizeE164(raw) !== null;
}

/**
 * True when `raw` is storable as-is: valid *and* already canonical. A number
 * that only differs from its canonical form (a stray `0`, spaces, dashes) is
 * valid but non-canonical, which is what the audit script reports on.
 */
export function isCanonicalE164(raw: unknown): boolean {
  const normalized = normalizeE164(raw);
  return normalized !== null && normalized === raw;
}

/**
 * What can be done with a stored number that is not canonical E.164.
 *
 * - `canonical`     already correct; nothing to do.
 * - `normalized`    libphonenumber parses it as a real number, we just store
 *                   a non-canonical spelling of it (a national trunk prefix,
 *                   spaces, dashes). Zero inference: the canonical form is the
 *                   same number.
 * - `recovered`     the stored value is NOT dialable, but it is a dialable
 *                   number with its country code typed twice — `+91` followed
 *                   by `91` and the ten real digits, which is what happens when
 *                   someone pastes a full international number into a field
 *                   that already has the country selected. Dropping the
 *                   repeat yields a valid number. Some inference, so callers
 *                   are expected to treat this class separately.
 * - `unrecoverable` not a number and not repairable by any rule here. Too
 *                   short, impossible range, digits nobody can interpret. Needs
 *                   a human to ask its owner.
 */
export type PhoneRepairKind =
  | 'canonical'
  | 'normalized'
  | 'recovered'
  | 'unrecoverable';

export type PhoneRepair = {
  kind: PhoneRepairKind;
  /** The value to store. Null when nothing can be stored with confidence. */
  to: string | null;
};

/**
 * Decide what, if anything, a stored phone number should become.
 *
 * The `recovered` rule is only ever attempted on a value that is **already
 * invalid**. That is the safety property that makes it sound: a number which
 * genuinely begins with a repeat of its own country code parses as valid and
 * is returned as `canonical` or `normalized` long before the repeat is
 * considered, so a real number can never be shortened by this.
 */
export function classifyPhoneRepair(stored: string): PhoneRepair {
  const canonical = normalizeE164(stored);
  if (canonical === stored) return { kind: 'canonical', to: stored };
  if (canonical !== null) return { kind: 'normalized', to: canonical };

  // Invalid. Try dropping a country code that was entered twice.
  const digits = stored.replace(/\D/g, '');
  for (let ccLength = 1; ccLength <= 3; ccLength += 1) {
    const cc = digits.slice(0, ccLength);
    const rest = digits.slice(ccLength);
    if (!cc || !rest.startsWith(cc)) continue;
    const candidate = normalizeE164(`+${rest}`);
    if (candidate) return { kind: 'recovered', to: candidate };
  }

  return { kind: 'unrecoverable', to: null };
}

/**
 * Property validator for DTOs. Pair it with {@link NormalizeE164Phone} so the
 * value is canonicalized before it is checked — otherwise a repairable number
 * passes validation and is then persisted in its original, broken form.
 */
export function IsE164Phone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isE164Phone',
      target: object.constructor,
      propertyName,
      options: { message: E164_VALIDATION_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown): boolean {
          return isValidE164(value);
        },
      },
    });
  };
}

/**
 * Rewrites the incoming value to canonical E.164 before validation runs (the
 * global pipe is configured with `transform: true`).
 *
 * An unparseable value is passed through trimmed rather than nulled, so
 * {@link IsE164Phone} is the one that reports the problem and the client gets a
 * message about the number it actually sent.
 */
export function NormalizeE164Phone() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    return normalizeE164(value) ?? value.trim();
  });
}
