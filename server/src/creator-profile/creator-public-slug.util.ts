import { randomInt } from 'crypto';

// Crockford base32 without the ambiguous letters (I, L, O, U). Lowercase for
// clean, case-insensitive URLs. Used to mint opaque, non-guessable public
// slugs that carry no personal information (no name / handle / email).
const SLUG_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const SLUG_LENGTH = 8;

export function normalizeCreatorPublicProfileSlug(input: string): string {
  try {
    return decodeURIComponent(input).trim().toLowerCase().replace(/\s+/g, '');
  } catch {
    return input.trim().toLowerCase().replace(/\s+/g, '');
  }
}

/** Generate a random opaque slug token (e.g. "k7m2p9qx"). */
export function generateCreatorPublicSlug(): string {
  let out = '';
  for (let i = 0; i < SLUG_LENGTH; i++) {
    out += SLUG_ALPHABET[randomInt(0, SLUG_ALPHABET.length)];
  }
  return out;
}

export type CreatorPublicSlugLookupClient = {
  creatorProfile: {
    findFirst: (args: {
      where: {
        publicSlug: string;
        NOT?: { id: string };
      };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/**
 * Picks a unique opaque public profile slug. Generates random tokens and
 * retries on the (rare) collision. Intentionally derives nothing from the
 * creator's name so the URL never leaks identity.
 */
export async function allocateUniqueCreatorPublicSlug(
  client: CreatorPublicSlugLookupClient,
  excludeCreatorId?: string,
): Promise<string> {
  const notSelf = excludeCreatorId ? { NOT: { id: excludeCreatorId } } : {};

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = generateCreatorPublicSlug();
    const taken = await client.creatorProfile.findFirst({
      where: { publicSlug: candidate, ...notSelf },
      select: { id: true },
    });
    if (!taken) {
      return candidate;
    }
  }

  // Extremely unlikely fallback: widen the token to stay unique.
  return `${generateCreatorPublicSlug()}${generateCreatorPublicSlug()}`;
}
