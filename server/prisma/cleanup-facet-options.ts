import { CreatorFacetDimension, PrismaClient } from '@prisma/client';

/**
 * Retires creator-proposed facet options that should never have entered the
 * catalog, moving every creator holding one onto a real option.
 *
 * Same shape as {@link ./remove-face-creator-type.ts}, which did this once for
 * "Face Creator"; the list below is what is left:
 *
 *   1. APPEARANCE "Vaishnavi (Midsize) Manish (Athletic)" — a creator's note
 *      about two people, accepted as a body type by the "Other" resolver and
 *      shown to brands as a filter chip. Its creators move to "Athletic / Fit".
 *      No alias is left behind: the text is not a synonym of anything, and an
 *      alias would make it resolve silently next time instead of being
 *      rejected (the shape guard added alongside this script now rejects it).
 *   2. CREATOR_TYPE "Faceless And Face Creator" — two creator types in one
 *      option. Its creators move to "Individual / Solo", and the text is
 *      aliased to that option so the resolver canonicalizes it rather than
 *      re-creating the row.
 *
 * Matching is by slug or by label compared loosely, since the same label is
 * stored variously with "/", "&" or "and" between its halves. Siblings such as
 * "Faceless" are left alone — only whole-label matches count.
 *
 * Semantics:
 *   - Dry run unless FACET_CLEANUP_APPLY=true. The default prints every
 *     affected creator by name and writes nothing.
 *   - Idempotent: a second run finds no options and exits cleanly.
 *   - Each retirement is applied in its own transaction.
 *
 * Usage:
 *   npm run prisma:cleanup:facet-options               # dry run
 *   FACET_CLEANUP_APPLY=true npm run prisma:cleanup:facet-options
 */

const prisma = new PrismaClient();
const LOG = '[cleanup-facet-options]';

interface Retirement {
  dimension: CreatorFacetDimension;
  /** Slugs the "Other" resolver's slugify() may have produced. */
  sourceSlugs: string[];
  /** Label to match loosely (separators and case ignored). */
  sourceLabel: string;
  /** Seeded option the creators move to. */
  targetSlug: string;
  /**
   * Keep the source text resolving to the target afterwards. Only for a real
   * synonym — never for junk, which should go back to being rejected.
   */
  aliasSourceLabel: boolean;
}

const RETIREMENTS: Retirement[] = [
  {
    dimension: CreatorFacetDimension.APPEARANCE,
    sourceSlugs: ['vaishnavi_midsize_manish_athletic'],
    sourceLabel: 'Vaishnavi (Midsize) Manish (Athletic)',
    targetSlug: 'athletic_fit',
    aliasSourceLabel: false,
  },
  {
    dimension: CreatorFacetDimension.CREATOR_TYPE,
    sourceSlugs: [
      'faceless_and_face_creator',
      'faceless_face_creator',
      'faceless-and-face-creator',
    ],
    sourceLabel: 'Faceless And Face Creator',
    targetSlug: 'individual_solo',
    aliasSourceLabel: true,
  },
];

function isApply(): boolean {
  return process.env.FACET_CLEANUP_APPLY === 'true';
}

/**
 * Lowercase, drop everything that is not a letter or a digit. "Faceless And
 * Face Creator", "Faceless / Face Creator" and "Faceless & Face Creator" all
 * collapse to the same key, so the stored spelling does not matter.
 */
function looseKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/\band\b/g, '')
    .replace(/[^a-z0-9]+/g, '');
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

type AffectedSelection = {
  id: string;
  creatorProfileId: string;
  creator: { displayName: string; publicSlug: string };
};

function printCreators(heading: string, rows: AffectedSelection[]): void {
  if (!rows.length) return;
  console.log(`${LOG} ${heading} (${rows.length}):`);
  for (const r of rows) {
    console.log(
      `${LOG}   - ${r.creator.displayName} (/${r.creator.publicSlug}) ` +
        `id=${r.creatorProfileId}`,
    );
  }
}

async function retire(entry: Retirement, apply: boolean): Promise<void> {
  const { dimension, targetSlug } = entry;
  console.log(`${LOG} --- ${dimension}: "${entry.sourceLabel}" ---`);

  const wanted = looseKey(entry.sourceLabel);
  const all = await prisma.creatorFacetOption.findMany({
    where: { dimension },
    select: { id: true, slug: true, label: true, status: true },
  });

  const target = all.find((o) => o.slug === targetSlug);
  if (!target) {
    throw new Error(
      `${LOG} Target ${dimension}/${targetSlug} is missing. Run the facet ` +
        'seed first; refusing to delete an option with nowhere to move its ' +
        'creators.',
    );
  }

  const sources = all.filter(
    (o) =>
      o.id !== target.id &&
      (entry.sourceSlugs.includes(o.slug) || looseKey(o.label) === wanted),
  );
  if (!sources.length) {
    console.log(`${LOG} Not found — nothing to do.`);
    return;
  }

  const sourceIds = sources.map((o) => o.id);
  console.log(
    `${LOG} Removing: ` +
      sources
        .map((o) => `${o.slug} ("${o.label}", status=${o.status})`)
        .join(', '),
  );
  console.log(`${LOG} Target: ${target.slug} ("${target.label}")`);

  // Split by whether the creator already holds the target: a straight optionId
  // update would collide with the unique (creatorProfileId, optionId) index.
  const selections = await prisma.creatorProfileFacetSelection.findMany({
    where: { optionId: { in: sourceIds } },
    select: {
      id: true,
      creatorProfileId: true,
      creator: { select: { displayName: true, publicSlug: true } },
    },
    orderBy: { creator: { displayName: 'asc' } },
  });
  const alreadyTarget = await prisma.creatorProfileFacetSelection.findMany({
    where: {
      optionId: target.id,
      creatorProfileId: {
        in: [...new Set(selections.map((s) => s.creatorProfileId))],
      },
    },
    select: { creatorProfileId: true },
  });
  const alreadyTargetIds = new Set(
    alreadyTarget.map((s) => s.creatorProfileId),
  );

  const toMove = selections.filter(
    (s) => !alreadyTargetIds.has(s.creatorProfileId),
  );
  const toDrop = selections.filter((s) =>
    alreadyTargetIds.has(s.creatorProfileId),
  );

  const aliases = await prisma.creatorFacetOptionAlias.findMany({
    where: { optionId: { in: sourceIds } },
    select: { id: true, normalizedText: true },
  });

  // Name every affected creator: a preview you have to trust a count for is
  // not a preview.
  printCreators(`Moving to "${target.label}"`, toMove);
  printCreators('Dropping duplicate selection', toDrop);
  if (aliases.length) {
    console.log(
      `${LOG} Aliases to ${entry.aliasSourceLabel ? 'repoint' : 'delete'}: ` +
        aliases.map((a) => `"${a.normalizedText}"`).join(', '),
    );
  }

  if (!apply) return;

  await prisma.$transaction(
    async (tx) => {
      // Move creators off the option BEFORE deleting it: the selection FK
      // cascades on delete, which would wipe their answer entirely.
      if (toMove.length) {
        await tx.creatorProfileFacetSelection.updateMany({
          where: { id: { in: toMove.map((s) => s.id) } },
          data: { optionId: target.id, rank: 0, customLabel: null },
        });
      }
      if (toDrop.length) {
        await tx.creatorProfileFacetSelection.deleteMany({
          where: { id: { in: toDrop.map((s) => s.id) } },
        });
      }

      if (entry.aliasSourceLabel) {
        if (aliases.length) {
          await tx.creatorFacetOptionAlias.updateMany({
            where: { id: { in: aliases.map((a) => a.id) } },
            data: { optionId: target.id },
          });
        }
        await tx.creatorFacetOptionAlias.upsert({
          where: {
            dimension_normalizedText: {
              dimension,
              normalizedText: entry.sourceLabel.toLowerCase(),
            },
          },
          create: {
            dimension,
            normalizedText: entry.sourceLabel.toLowerCase(),
            optionId: target.id,
            source: 'manual',
          },
          update: { optionId: target.id, source: 'manual' },
        });
      } else if (aliases.length) {
        // Junk: drop its learned aliases so the text is classified from
        // scratch — and rejected — if anyone types it again.
        await tx.creatorFacetOptionAlias.deleteMany({
          where: { id: { in: aliases.map((a) => a.id) } },
        });
      }

      await tx.creatorFacetOption.deleteMany({
        where: { id: { in: sourceIds } },
      });
    },
    { timeout: 120_000 },
  );

  console.log(
    `${LOG} Done. moved=${toMove.length} droppedDuplicates=${toDrop.length} ` +
      `aliases=${aliases.length} optionsDeleted=${sourceIds.length}`,
  );
}

async function main(): Promise<void> {
  const apply = isApply();
  console.log(`${LOG} ${apply ? 'APPLY' : 'DRY RUN'} (${dbFingerprint()})`);

  for (const entry of RETIREMENTS) {
    await retire(entry, apply);
  }

  if (!apply) {
    console.log(
      `${LOG} DRY RUN — nothing was written. ` +
        'Set FACET_CLEANUP_APPLY=true to act.',
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
