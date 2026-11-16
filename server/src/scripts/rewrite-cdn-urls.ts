/**
 * Rewrite stored CDN URLs after moving the media bucket behind a new
 * distribution.
 *
 * Twenty columns across eight tables hold ABSOLUTE urls, not keys —
 * StorageService.buildCdnUrl() composes `${CDN_BASE_URL}/${key}` at write time
 * and the result is persisted. So changing CDN_BASE_URL does nothing to rows
 * already written: new uploads resolve, every existing image and video 404s.
 * That reads as an intermittent fault rather than a migration, which is why
 * this exists.
 *
 * Safe because of one rule: a row is only touched when its value STARTS WITH
 * the old base. That is what keeps user-entered external links
 * (instagramUrl, youtubeUrl, snapchatUrl, productPageUrl) and un-mirrored
 * Instagram CDN urls out of it, without having to reason about each column.
 *
 * Idempotent: a second run matches nothing, because nothing still starts with
 * the old base.
 *
 *   OLD_CDN_BASE_URL=https://d7bgbzuwobk5f.cloudfront.net \
 *   CDN_BASE_URL=https://cdn.gocollab.io \
 *     node dist/scripts/rewrite-cdn-urls.js --dry-run
 *
 * Run the dry run first. Run the real pass only once the NEW distribution
 * already serves the files — both urls work at that point, since the two
 * distributions front the same keys, so there is no window where either is
 * broken.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Every String column in the schema whose name ends in `Url`. The external
 * ones are deliberately included rather than filtered out: the prefix test
 * already excludes them, and listing all twenty means a column added later is
 * noticed as missing here rather than silently skipped.
 */
const TARGETS: ReadonlyArray<readonly [table: string, column: string]> = [
  ['CreatorProfile', 'introVideoUrl'],
  ['CreatorProfile', 'previewVideoUrl'],
  ['CreatorProfile', 'profileImageUrl'],
  ['CreatorProfile', 'instagramUrl'], // external
  ['CreatorProfile', 'youtubeUrl'], // external
  ['CreatorProfile', 'snapchatUrl'], // external
  ['Brief', 'brandPronunciationAudioUrl'],
  ['Brief', 'brandLogoUrl'],
  ['Brief', 'productPageUrl'], // external
  ['Brief', 'productImageUrl'],
  ['CreatorPortfolioVideo', 'videoUrl'],
  ['CreatorPortfolioVideo', 'thumbnailUrl'],
  ['CreatorDemoVideo', 'videoUrl'],
  ['CreatorDemoVideo', 'thumbnailUrl'],
  ['Agency', 'logoUrl'],
  ['BrandProfile', 'logoUrl'],
  ['BrandProfile', 'brandPronunciationAudioUrl'],
  ['BrandProfile', 'instagramUrl'], // external
  ['InstagramMediaItem', 'mediaUrl'], // mirrored ones only
  ['InstagramMediaItem', 'thumbnailUrl'], // mirrored ones only
];

function stripTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  const oldBase = stripTrailingSlash((process.env.OLD_CDN_BASE_URL || '').trim());
  const newBase = stripTrailingSlash((process.env.CDN_BASE_URL || '').trim());

  if (!oldBase || !newBase) {
    console.error('Set both OLD_CDN_BASE_URL and CDN_BASE_URL.');
    process.exit(2);
  }
  if (oldBase === newBase) {
    console.error(`OLD_CDN_BASE_URL and CDN_BASE_URL are both ${oldBase}. Nothing to do.`);
    process.exit(2);
  }
  for (const [label, value] of [['OLD_CDN_BASE_URL', oldBase], ['CDN_BASE_URL', newBase]]) {
    if (!/^https?:\/\/[^/]+$/.test(value)) {
      console.error(`${label} should be a bare origin like https://cdn.example.com — got "${value}"`);
      process.exit(2);
    }
  }

  console.log(`${dryRun ? 'Dry run' : 'Rewriting'}: ${oldBase}  ->  ${newBase}\n`);

  // LEFT(col, n) = base rather than LIKE: `_` is a LIKE wildcard, and an
  // unescaped one in a hostname would silently widen the match.
  const len = oldBase.length;
  let total = 0;

  for (const [table, column] of TARGETS) {
    // Identifiers cannot be bound as parameters. They come from the frozen
    // list above and never from input, so interpolating them is safe here.
    const where = `WHERE LEFT("${column}", ${len}) = $1`;
    let affected: number;

    if (dryRun) {
      const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}" ${where}`,
        oldBase,
      );
      affected = Number(rows[0]?.count ?? 0);
    } else {
      affected = await prisma.$executeRawUnsafe(
        `UPDATE "${table}" SET "${column}" = $2 || SUBSTRING("${column}" FROM ${len + 1}) ${where}`,
        oldBase,
        newBase,
      );
    }

    total += affected;
    if (affected > 0) {
      console.log(`  ${String(affected).padStart(6)}  ${table}.${column}`);
    }
  }

  console.log(`\n${dryRun ? 'Would rewrite' : 'Rewrote'} ${total} value(s).`);
  if (dryRun) {
    console.log('Re-run without --dry-run to apply.');
  } else if (total > 0) {
    console.log(`Set CDN_BASE_URL=${newBase} in the env file and reload, so new uploads match.`);
  }
}

main()
  .catch((err) => {
    console.error('rewrite-cdn-urls failed:', err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
