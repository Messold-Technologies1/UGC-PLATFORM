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

/**
 * Route segments the public profile route cannot use, mirrored from the
 * client's RESERVED_PUBLIC_SLUGS. A revealed name that slugifies to one of
 * these gets a numeric suffix instead.
 */
const RESERVED_PUBLIC_SLUGS = new Set([
  'brands',
  'creators',
  'about',
  'contact',
  'legal',
  'login',
  'register',
  'admin',
  'brand',
  'creator',
  'wishlists',
  'api',
]);

const NAME_SLUG_MAX_LENGTH = 60;

/**
 * Turn an admin-entered display name into a URL segment ("Riya  Sharma" ->
 * "riya-sharma"). Returns '' when the name has nothing sluggable in it.
 */
export function slugifyCreatorPublicName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, NAME_SLUG_MAX_LENGTH)
    .replace(/-+$/, '');
}

export type CreatorPublicNameSlugLookupClient = {
  creatorProfile: {
    findFirst: (args: {
      where: {
        OR: Array<{ publicSlug?: string; publicNameSlug?: string }>;
        NOT?: { id: string };
      };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

/**
 * Pick a unique URL segment for a revealed name. Checks BOTH slug columns so a
 * name slug can never shadow another creator's opaque slug, and appends -2, -3
 * ... on collision. Returns null when the name has no sluggable characters.
 */
export async function allocateUniqueCreatorPublicNameSlug(
  client: CreatorPublicNameSlugLookupClient,
  name: string,
  excludeCreatorId?: string,
): Promise<string | null> {
  const base = slugifyCreatorPublicName(name);
  if (!base) return null;

  const notSelf = excludeCreatorId ? { NOT: { id: excludeCreatorId } } : {};

  for (let attempt = 1; attempt <= 50; attempt++) {
    const candidate = attempt === 1 ? base : `${base}-${attempt}`;
    if (RESERVED_PUBLIC_SLUGS.has(candidate)) continue;

    const taken = await client.creatorProfile.findFirst({
      where: {
        OR: [{ publicSlug: candidate }, { publicNameSlug: candidate }],
        ...notSelf,
      },
      select: { id: true },
    });
    if (!taken) return candidate;
  }

  return `${base}-${generateCreatorPublicSlug()}`;
}

/**
 * True when a creator's name slug carries a collision suffix — i.e. another
 * creator already has this exact name, so the two public pages live at
 * /riya-sharma and /riya-sharma-2. Lets the admin UI say so instead of leaving
 * them to spot the "-2".
 */
export function isSharedCreatorPublicName(
  displayName: string | null,
  publicNameSlug: string | null,
): boolean {
  if (!displayName || !publicNameSlug) return false;
  return publicNameSlug !== slugifyCreatorPublicName(displayName);
}
