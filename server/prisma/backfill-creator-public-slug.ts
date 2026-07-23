import { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

// Self-contained (no imports from ../src) so it runs in the production image,
// which ships compiled dist/ without the TypeScript sources. Keep the alphabet
// and length in sync with src/creator-profile/creator-public-slug.util.ts.
const SLUG_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
const SLUG_LENGTH = 8;
const OPAQUE_SLUG = /^[0-9abcdefghjkmnpqrstvwxyz]{8}$/;

function generateSlug(): string {
  let out = '';
  for (let i = 0; i < SLUG_LENGTH; i++) {
    out += SLUG_ALPHABET[randomInt(0, SLUG_ALPHABET.length)];
  }
  return out;
}

function normalize(input: string): string {
  try {
    return decodeURIComponent(input).trim().toLowerCase().replace(/\s+/g, '');
  } catch {
    return input.trim().toLowerCase().replace(/\s+/g, '');
  }
}

async function allocateUniqueSlug(excludeCreatorId: string): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const candidate = generateSlug();
    const taken = await prisma.creatorProfile.findFirst({
      where: { publicSlug: candidate, NOT: { id: excludeCreatorId } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${generateSlug()}${generateSlug()}`;
}

function dbFingerprint(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'DATABASE_URL=<missing>';
  try {
    const u = new URL(url);
    return `host=${u.host} db=${u.pathname.replace(/^\//, '') || '<no-db>'}`;
  } catch {
    return 'DATABASE_URL=<unparseable>';
  }
}

async function main(): Promise<void> {
  const profiles = await prisma.creatorProfile.findMany({
    select: { id: true, publicSlug: true },
  });

  // Anything that is not our 8-char opaque token (old name-based slugs like
  // "riyasharma" or "riya-4821") still leaks identity and must be rotated.
  const stale = profiles.filter(
    (p) => !OPAQUE_SLUG.test(normalize(p.publicSlug ?? '')),
  );

  if (stale.length === 0) {
    console.log(
      `[backfill] All ${profiles.length} creator slugs are already opaque. (${dbFingerprint()})`,
    );
    return;
  }

  let rotated = 0;
  for (const profile of stale) {
    const slug = await allocateUniqueSlug(profile.id);
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: { publicSlug: slug },
    });
    rotated += 1;
  }

  console.log(
    `[backfill] Rotated ${rotated}/${profiles.length} creator publicSlug(s) to opaque tokens. (${dbFingerprint()})`,
  );
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
