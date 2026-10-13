import { PrismaClient } from '@prisma/client';

/**
 * Collapses duplicate "Open to" labels onto the one that stays.
 *
 * The filter's chips come from the CreatorRestrictionSuggestion table, which
 * only ever had rows added to it, so a label and a longer spelling of the same
 * thing ended up side by side — a brand saw both "Gambling" and
 * "Gambling / Betting", and both "Lingerie" and "Intimate wear / lingerie",
 * with the creators split across the pair.
 *
 * For each pair below: every creator holding the retired label gets the one
 * that stays (or loses the duplicate, where they already hold both — the
 * CreatorRestriction row is unique per creator and label), and the retired
 * suggestion row is deleted so the chip disappears.
 *
 * Matching is case-insensitive on the whole label; nothing is matched by
 * substring, so "Intimacy / Adult" is never touched by the lingerie pair.
 *
 * Semantics:
 *   - Dry run unless RESTRICTION_CLEANUP_APPLY=true. The default prints every
 *     affected creator by name and writes nothing.
 *   - Idempotent: a second run finds nothing and exits cleanly.
 *   - Each pair is applied in its own transaction.
 *
 * Usage (from server/, in the deployed container):
 *   npm run cleanup:creator-restrictions                        # dry run
 *   RESTRICTION_CLEANUP_APPLY=true npm run cleanup:creator-restrictions
 *
 * Or in dev, without a build:
 *   node -r ts-node/register/transpile-only src/scripts/cleanup-creator-restrictions.ts
 */

const prisma = new PrismaClient();
const LOG = '[cleanup-creator-restrictions]';

interface Collapse {
  /** The label being retired. */
  from: string;
  /** The label its creators move to. Must already exist as a suggestion. */
  to: string;
}

const COLLAPSES: Collapse[] = [
  { from: 'Gambling / Betting', to: 'Gambling' },
  { from: 'Intimate wear / lingerie', to: 'Lingerie' },
];

function isApply(): boolean {
  return process.env.RESTRICTION_CLEANUP_APPLY === 'true';
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
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

async function collapse(entry: Collapse, apply: boolean): Promise<void> {
  const { from, to } = entry;
  console.log(`${LOG} --- "${from}" -> "${to}" ---`);

  const rows = await prisma.creatorRestriction.findMany({
    where: { restriction: { equals: from, mode: 'insensitive' } },
    select: {
      id: true,
      creatorId: true,
      restriction: true,
      creator: { select: { displayName: true, publicSlug: true } },
    },
    orderBy: { creator: { displayName: 'asc' } },
  });

  const suggestions = await prisma.creatorRestrictionSuggestion.findMany({
    where: { normalizedName: normalize(from) },
    select: { id: true, name: true },
  });

  if (!rows.length && !suggestions.length) {
    console.log(`${LOG} Nothing holds or offers "${from}" — nothing to do.`);
    return;
  }

  // Creators already holding the target would collide with the unique
  // (creatorId, restriction) index, so their retired row is dropped instead.
  const alreadyTarget = await prisma.creatorRestriction.findMany({
    where: {
      restriction: { equals: to, mode: 'insensitive' },
      creatorId: { in: [...new Set(rows.map((r) => r.creatorId))] },
    },
    select: { creatorId: true },
  });
  const alreadyTargetIds = new Set(alreadyTarget.map((r) => r.creatorId));

  const toMove = rows.filter((r) => !alreadyTargetIds.has(r.creatorId));
  const toDrop = rows.filter((r) => alreadyTargetIds.has(r.creatorId));

  for (const [heading, list] of [
    [`Moving to "${to}"`, toMove],
    [`Dropping duplicate "${from}"`, toDrop],
  ] as const) {
    if (!list.length) continue;
    console.log(`${LOG} ${heading} (${list.length}):`);
    for (const r of list) {
      console.log(
        `${LOG}   - ${r.creator.displayName} (/${r.creator.publicSlug}) ` +
          `stored as "${r.restriction}"`,
      );
    }
  }
  if (suggestions.length) {
    console.log(
      `${LOG} Removing suggestion row(s): ` +
        suggestions.map((s) => `"${s.name}"`).join(', '),
    );
  }

  if (!apply) return;

  await prisma.$transaction(
    async (tx) => {
      if (toMove.length) {
        await tx.creatorRestriction.updateMany({
          where: { id: { in: toMove.map((r) => r.id) } },
          data: { restriction: to },
        });
      }
      if (toDrop.length) {
        await tx.creatorRestriction.deleteMany({
          where: { id: { in: toDrop.map((r) => r.id) } },
        });
      }
      if (suggestions.length) {
        await tx.creatorRestrictionSuggestion.deleteMany({
          where: { id: { in: suggestions.map((s) => s.id) } },
        });
      }
    },
    { timeout: 120_000 },
  );

  console.log(
    `${LOG} Done. moved=${toMove.length} droppedDuplicates=${toDrop.length} ` +
      `suggestionsDeleted=${suggestions.length}`,
  );
}

async function main(): Promise<void> {
  const apply = isApply();
  console.log(`${LOG} ${apply ? 'APPLY' : 'DRY RUN'} (${dbFingerprint()})`);

  // Refuse to retire a label with nowhere to send its creators.
  for (const { to } of COLLAPSES) {
    const target = await prisma.creatorRestrictionSuggestion.findUnique({
      where: { normalizedName: normalize(to) },
      select: { id: true },
    });
    if (!target) {
      throw new Error(
        `${LOG} Target suggestion "${to}" is missing. Run the seed first; ` +
          'refusing to retire a label with nowhere to move its creators.',
      );
    }
  }

  for (const entry of COLLAPSES) {
    await collapse(entry, apply);
  }

  if (!apply) {
    console.log(
      `${LOG} DRY RUN — nothing was written. ` +
        'Set RESTRICTION_CLEANUP_APPLY=true to act.',
    );
  }
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
