import { randomInt } from 'crypto';

export function normalizeCreatorPublicProfileSlug(input: string): string {
  try {
    return decodeURIComponent(input).trim().toLowerCase().replace(/\s+/g, '');
  } catch {
    return input.trim().toLowerCase().replace(/\s+/g, '');
  }
}

export function deriveCreatorPublicSlugBase(displayName: string): string {
  const base = normalizeCreatorPublicProfileSlug(displayName);
  return base || 'creator';
}

function randomNumericSuffix(): string {
  return String(randomInt(1000, 10_000));
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
 * Picks a unique public profile slug: base from display name, then `-NNNN` on collision.
 */
export async function allocateUniqueCreatorPublicSlug(
  client: CreatorPublicSlugLookupClient,
  displayName: string,
  excludeCreatorId?: string,
): Promise<string> {
  const base = deriveCreatorPublicSlugBase(displayName);
  const notSelf = excludeCreatorId ? { NOT: { id: excludeCreatorId } } : {};

  const baseTaken = await client.creatorProfile.findFirst({
    where: { publicSlug: base, ...notSelf },
    select: { id: true },
  });
  if (!baseTaken) {
    return base;
  }

  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = `${base}-${randomNumericSuffix()}`;
    const taken = await client.creatorProfile.findFirst({
      where: { publicSlug: candidate, ...notSelf },
      select: { id: true },
    });
    if (!taken) {
      return candidate;
    }
  }

  return `${base}-${randomInt(100_000, 1_000_000)}`;
}
