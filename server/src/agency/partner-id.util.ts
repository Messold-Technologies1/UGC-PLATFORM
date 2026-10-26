/**
 * An agency's partner code — the string an agency gives a brand so the brand
 * can ask to be managed. The brand types it in, the agency accepts, and only
 * then does the agency get any access.
 *
 * The code is an identifier, not a secret. Knowing one lets a stranger *ask*;
 * it never grants anything on its own, because the agency still has to accept.
 * That is what makes it safe to read out over a phone call or paste into
 * WhatsApp — which is also why the alphabet below matters.
 *
 * Crockford base32 drops I, L, O and U: the first three because they are
 * misread as 1, 1 and 0, and U because excluding it keeps accidental profanity
 * out of generated codes. `GC-7F3K-92QX` therefore survives being dictated,
 * handwritten, or retyped from a screenshot.
 *
 * Codes are stored uppercase and compared case-insensitively, so a brand
 * pasting `gc-7f3k-92qx` still resolves. Rotation is safe at any time: links
 * are keyed on the agency's id, never on the code, so rotating a leaked code
 * invalidates future requests without touching relationships already accepted.
 */

/** Crockford base32: no I, L, O or U. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const PREFIX = 'GC';
const GROUP_LENGTH = 4;
const GROUP_COUNT = 2;

/**
 * Matches a canonical code. Anchored, so it rejects anything with leading or
 * trailing junk rather than matching a code embedded in a longer string.
 */
export const PARTNER_ID_PATTERN = new RegExp(
  `^${PREFIX}-[${ALPHABET}]{${GROUP_LENGTH}}-[${ALPHABET}]{${GROUP_LENGTH}}$`,
);

/**
 * Canonicalise user input into the stored form, or null when it could not be a
 * partner code at all.
 *
 * Forgiving about how a human might deliver a code — lowercase, padded with
 * spaces, carrying zero-width characters from a chat client, or with the dashes
 * dropped — and strict about what counts as one once normalised. Returning null
 * rather than throwing lets callers answer "no such code" uniformly, so a
 * malformed code and an unknown code are indistinguishable to the caller and
 * cannot be used to probe which codes exist.
 */
export function normalizePartnerId(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  // Strip everything that is not alphanumeric: spaces, dashes, zero-width
  // characters, and the stray punctuation that survives a copy-paste.
  const stripped = raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (stripped.length !== PREFIX.length + GROUP_LENGTH * GROUP_COUNT)
    return null;
  if (!stripped.startsWith(PREFIX)) return null;

  const body = stripped.slice(PREFIX.length);
  for (const char of body) {
    if (!ALPHABET.includes(char)) return null;
  }

  const groups: string[] = [];
  for (let i = 0; i < GROUP_COUNT; i += 1) {
    groups.push(body.slice(i * GROUP_LENGTH, (i + 1) * GROUP_LENGTH));
  }

  return `${PREFIX}-${groups.join('-')}`;
}

/**
 * A fresh code. `randomInt` is drawn from the crypto RNG rather than
 * `Math.random`, so codes are not predictable from one another — a weak RNG
 * would let someone who holds one code guess the next agency's.
 *
 * Uniqueness is the caller's business: generate, try to persist, and retry on a
 * unique-constraint violation. 32^8 is ~1.1e12, so a collision is remote, but
 * the database constraint is what actually guarantees it.
 */
export function generatePartnerId(
  randomInt: (maxExclusive: number) => number,
): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUP_COUNT; g += 1) {
    let group = '';
    for (let i = 0; i < GROUP_LENGTH; i += 1) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return `${PREFIX}-${groups.join('-')}`;
}
