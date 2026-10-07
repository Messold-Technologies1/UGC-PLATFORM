import { CreatorFacetDimension, PrismaClient } from '@prisma/client';

/**
 * Retires the creator-proposed CREATOR_TYPE option "Face Creator".
 *
 * "Face Creator" was never part of the seeded catalog
 * ({@link ../prisma/creator-facet-seed.ts}) — it was added by the AI "Other"
 * resolver when a creator typed it. It duplicates "Individual / Solo", so:
 *
 *   1. every creator whose creator type is "Face Creator" is moved to
 *      "Individual / Solo" (if they somehow already hold "Individual / Solo"
 *      too, the duplicate "Face Creator" selection is dropped instead — the
 *      selection table is unique per (creatorProfileId, optionId));
 *   2. learned aliases that pointed at "Face Creator" are repointed to
 *      "Individual / Solo", and a manual alias for the text "face creator" is
 *      added, so the "Other" resolver canonicalizes that free text instead of
 *      re-creating the option;
 *   3. the "Face Creator" option row is deleted.
 *
 * Matching is exact (slug `face_creator` / `face-creator`, or label
 * "face creator" case-insensitively), so sibling options such as
 * "Faceless And Face Creator" and "Faceless" are left alone.
 *
 * Semantics:
 *   - Dry run unless REMOVE_FACE_CREATOR_APPLY=true. The default prints what it
 *     would change and writes nothing.
 *   - Idempotent: a second run finds no option and exits cleanly.
 *   - All writes happen in a single transaction.
 *
 * Usage:
 *   npm run prisma:cleanup:face-creator-type               # dry run
 *   REMOVE_FACE_CREATOR_APPLY=true npm run prisma:cleanup:face-creator-type
 */

const prisma = new PrismaClient();

const LOG_PREFIX = '[remove-face-creator-type]';
const DIMENSION = CreatorFacetDimension.CREATOR_TYPE;
/** Slugs the "Other" resolver's slugify() would produce for "Face Creator". */
const SOURCE_SLUGS = ['face_creator', 'face-creator'];
const SOURCE_LABEL = 'face creator';
const TARGET_SLUG = 'individual_solo';

function isApply(): boolean {
  return process.env.REMOVE_FACE_CREATOR_APPLY === 'true';
}

type AffectedSelection = {
  creatorProfileId: string;
  creator: { displayName: string; publicSlug: string };
};

function printCreators(heading: string, rows: AffectedSelection[]): void {
  if (!rows.length) return;
  console.log(`${LOG_PREFIX} ${heading} (${rows.length}):`);
  for (const r of rows) {
    console.log(
      `${LOG_PREFIX}   - ${r.creator.displayName} ` +
        `(/${r.creator.publicSlug}) id=${r.creatorProfileId}`,
    );
  }
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
  const apply = isApply();
  console.log(
    `${LOG_PREFIX} ${apply ? 'APPLY' : 'DRY RUN'} (${dbFingerprint()})`,
  );

  const candidates = await prisma.creatorFacetOption.findMany({
    where: {
      dimension: DIMENSION,
      OR: [
        { slug: { in: SOURCE_SLUGS } },
        { label: { equals: SOURCE_LABEL, mode: 'insensitive' } },
      ],
    },
    select: { id: true, slug: true, label: true, status: true },
  });

  if (candidates.length === 0) {
    console.log(
      `${LOG_PREFIX} No "Face Creator" ${DIMENSION} option found — nothing to do.`,
    );
    return;
  }

  const target = await prisma.creatorFacetOption.findUnique({
    where: { dimension_slug: { dimension: DIMENSION, slug: TARGET_SLUG } },
    select: { id: true, label: true },
  });
  if (!target) {
    throw new Error(
      `${LOG_PREFIX} Target option ${DIMENSION}/${TARGET_SLUG} is missing. ` +
        'Run the facet seed first; refusing to delete "Face Creator" with ' +
        'nowhere to move its creators.',
    );
  }
  // Guard against a catalog where "Individual / Solo" itself somehow matched.
  const sources = candidates.filter((o) => o.id !== target.id);
  if (sources.length === 0) {
    console.log(
      `${LOG_PREFIX} Only the target option matched — nothing to do.`,
    );
    return;
  }
  const sourceIds = sources.map((o) => o.id);
  console.log(
    `${LOG_PREFIX} Matched ${sources.length} option(s) to remove: ` +
      sources
        .map((o) => `${o.slug} ("${o.label}", status=${o.status})`)
        .join(', '),
  );
  console.log(
    `${LOG_PREFIX} Target: ${TARGET_SLUG} ("${target.label}") id=${target.id}`,
  );

  // Creators holding "Face Creator", split by whether they already hold the
  // target (a straight optionId update would break the unique selection index).
  const faceSelections = await prisma.creatorProfileFacetSelection.findMany({
    where: { optionId: { in: sourceIds } },
    select: {
      id: true,
      creatorProfileId: true,
      creator: { select: { displayName: true, publicSlug: true } },
    },
    orderBy: { creator: { displayName: 'asc' } },
  });
  const creatorIds = [
    ...new Set(faceSelections.map((s) => s.creatorProfileId)),
  ];
  const alreadyTarget = await prisma.creatorProfileFacetSelection.findMany({
    where: { optionId: target.id, creatorProfileId: { in: creatorIds } },
    select: { creatorProfileId: true },
  });
  const alreadyTargetIds = new Set(
    alreadyTarget.map((s) => s.creatorProfileId),
  );

  const toMove = faceSelections.filter(
    (s) => !alreadyTargetIds.has(s.creatorProfileId),
  );
  const toDrop = faceSelections.filter((s) =>
    alreadyTargetIds.has(s.creatorProfileId),
  );

  // Learned synonyms of "Face Creator" become synonyms of the target. Repointing
  // can never collide: aliases are unique on [dimension, normalizedText], so no
  // other option can already hold one of these texts.
  const aliases = await prisma.creatorFacetOptionAlias.findMany({
    where: { optionId: { in: sourceIds } },
    select: { id: true, normalizedText: true },
  });

  console.log(
    `${LOG_PREFIX} Creator selections: ${toMove.length} to move to ` +
      `"${target.label}", ${toDrop.length} duplicate(s) to drop. ` +
      `Aliases to repoint: ${aliases.length}` +
      (aliases.length
        ? ` (${aliases.map((a) => `"${a.normalizedText}"`).join(', ')})`
        : ''),
  );

  // Name every affected creator so the dry run can be eyeballed before the
  // apply. Listed in full on purpose: a preview you have to trust a count for
  // is not a preview.
  printCreators(`Moving to "${target.label}"`, toMove);
  printCreators('Dropping duplicate "Face Creator" selection', toDrop);

  if (!apply) {
    console.log(
      `${LOG_PREFIX} DRY RUN — nothing was written. ` +
        'Set REMOVE_FACE_CREATOR_APPLY=true to act.',
    );
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      // Move creators off "Face Creator" BEFORE deleting the option: the
      // selection FK cascades on delete, which would wipe their creator type.
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
      if (aliases.length) {
        await tx.creatorFacetOptionAlias.updateMany({
          where: { id: { in: aliases.map((a) => a.id) } },
          data: { optionId: target.id },
        });
      }
      // Keep "face creator" free text resolving to Individual / Solo so the
      // "Other" resolver never re-creates the option we just deleted.
      await tx.creatorFacetOptionAlias.upsert({
        where: {
          dimension_normalizedText: {
            dimension: DIMENSION,
            normalizedText: SOURCE_LABEL,
          },
        },
        create: {
          dimension: DIMENSION,
          normalizedText: SOURCE_LABEL,
          optionId: target.id,
          source: 'manual',
        },
        update: { optionId: target.id, source: 'manual' },
      });

      await tx.creatorFacetOption.deleteMany({
        where: { id: { in: sourceIds } },
      });
    },
    { timeout: 120_000 },
  );

  console.log(
    `${LOG_PREFIX} Done. moved=${toMove.length} droppedDuplicates=${toDrop.length} ` +
      `aliasesRepointed=${aliases.length} optionsDeleted=${sourceIds.length}`,
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
