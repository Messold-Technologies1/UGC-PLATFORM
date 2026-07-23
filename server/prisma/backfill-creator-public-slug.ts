import { PrismaClient } from '@prisma/client';
import {
  allocateUniqueCreatorPublicSlug,
  normalizeCreatorPublicProfileSlug,
} from '../src/creator-profile/creator-public-slug.util';

const prisma = new PrismaClient();

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

// A slug is considered "opaque" only if it is exactly our 8-char token from the
// unambiguous alphabet. Anything else (old name-based slugs like "riyasharma"
// or "riya-4821") still leaks identity and must be rotated.
const OPAQUE_SLUG = /^[0-9abcdefghjkmnpqrstvwxyz]{8}$/;

async function main(): Promise<void> {
  const profiles = await prisma.creatorProfile.findMany({
    select: { id: true, publicSlug: true },
  });

  const stale = profiles.filter(
    (p) => !OPAQUE_SLUG.test(normalizeCreatorPublicProfileSlug(p.publicSlug ?? '')),
  );

  if (stale.length === 0) {
    console.log(
      `[backfill] All ${profiles.length} creator slugs are already opaque. (${dbFingerprint()})`,
    );
    return;
  }

  let rotated = 0;
  for (const profile of stale) {
    const slug = await allocateUniqueCreatorPublicSlug(prisma, profile.id);
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
