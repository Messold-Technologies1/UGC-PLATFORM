import { PrismaClient } from '@prisma/client';
import {
  CREATOR_RESTRICTION_LEGACY_MIGRATIONS,
  CREATOR_RESTRICTION_SUGGESTIONS,
  DEPRECATED_CREATOR_RESTRICTION_SUGGESTIONS,
  normalizeRestrictionSuggestion,
} from './creator-restriction-suggestions';

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

async function migrateLegacyAcceptsRows(): Promise<number> {
  let migrated = 0;
  for (const [legacy, current] of Object.entries(
    CREATOR_RESTRICTION_LEGACY_MIGRATIONS,
  )) {
    const rows = await prisma.creatorRestriction.findMany({
      where: { restriction: { equals: legacy, mode: 'insensitive' } },
    });
    for (const row of rows) {
      const duplicate = await prisma.creatorRestriction.findFirst({
        where: {
          creatorId: row.creatorId,
          restriction: { equals: current, mode: 'insensitive' },
          NOT: { id: row.id },
        },
      });
      if (duplicate) {
        await prisma.creatorRestriction.delete({ where: { id: row.id } });
      } else {
        await prisma.creatorRestriction.update({
          where: { id: row.id },
          data: { restriction: current },
        });
        migrated += 1;
      }
    }
  }
  if (migrated > 0) {
    console.log(`[backfill] Migrated ${migrated} creator row(s) from "accepts …" labels`);
  }
  return migrated;
}

async function main(): Promise<void> {
  console.log(
    `[backfill] Refreshing creator restriction suggestions (${dbFingerprint()})`,
  );

  await migrateLegacyAcceptsRows();

  let removedCreatorRows = 0;
  for (const legacy of DEPRECATED_CREATOR_RESTRICTION_SUGGESTIONS) {
    const normalized = normalizeRestrictionSuggestion(legacy);
    const deletedSuggestions = await prisma.creatorRestrictionSuggestion.deleteMany({
      where: { normalizedName: normalized },
    });
    const deletedRestrictions = await prisma.creatorRestriction.deleteMany({
      where: {
        restriction: { equals: legacy, mode: 'insensitive' },
      },
    });
    removedCreatorRows += deletedRestrictions.count;
    if (deletedSuggestions.count > 0 || deletedRestrictions.count > 0) {
      console.log(
        `[backfill] Removed legacy "${legacy}": suggestions=${deletedSuggestions.count}, creatorRows=${deletedRestrictions.count}`,
      );
    }
  }

  const deletedOptOutRows = await prisma.creatorRestriction.deleteMany({
    where: {
      restriction: { startsWith: 'does not accept', mode: 'insensitive' },
    },
  });
  removedCreatorRows += deletedOptOutRows.count;
  if (deletedOptOutRows.count > 0) {
    console.log(
      `[backfill] Removed ${deletedOptOutRows.count} creator row(s) with "does not accept …" labels`,
    );
  }

  const deletedOptOutSuggestions = await prisma.creatorRestrictionSuggestion.deleteMany({
    where: {
      name: { startsWith: 'does not accept', mode: 'insensitive' },
    },
  });
  if (deletedOptOutSuggestions.count > 0) {
    console.log(
      `[backfill] Removed ${deletedOptOutSuggestions.count} suggestion(s) with "does not accept …" labels`,
    );
  }

  const deletedAcceptsSuggestions = await prisma.creatorRestrictionSuggestion.deleteMany({
    where: {
      name: { startsWith: 'accepts ', mode: 'insensitive' },
    },
  });
  if (deletedAcceptsSuggestions.count > 0) {
    console.log(
      `[backfill] Removed ${deletedAcceptsSuggestions.count} orphaned "accepts …" suggestion(s)`,
    );
  }

  let upserted = 0;
  for (const name of CREATOR_RESTRICTION_SUGGESTIONS) {
    await prisma.creatorRestrictionSuggestion.upsert({
      where: { normalizedName: normalizeRestrictionSuggestion(name) },
      create: {
        name,
        normalizedName: normalizeRestrictionSuggestion(name),
      },
      update: { name },
    });
    upserted += 1;
  }

  const totalSuggestions = await prisma.creatorRestrictionSuggestion.count();
  console.log(
    `[backfill] Upserted ${upserted} suggestion(s). totalSuggestions=${totalSuggestions}. removedLegacyCreatorRows=${removedCreatorRows}`,
  );
}

(async () => {
  try {
    await main();
  } catch (err) {
    console.error('[backfill] Failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
