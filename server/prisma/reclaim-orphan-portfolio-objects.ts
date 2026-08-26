/**
 * Deletes S3 objects under `creator-portfolio/` that no CreatorPortfolioVideo
 * row references.
 *
 * Until the accompanying fix, deleting a portfolio video removed only the
 * database row, so every deletion left its video and thumbnail behind. Those
 * orphans sit under the same prefix as live objects, so no S3 lifecycle rule
 * can distinguish them — they have to be diffed against the database.
 *
 * This is the only script in the repo that deletes production media, so it is
 * deliberately hard to misfire:
 *
 *   - Dry run unless RECLAIM_ORPHANS_APPLY=true. The default prints what it
 *     would delete and exits.
 *   - Objects modified within GRACE_HOURS (default 48) are always skipped: an
 *     upload in flight, or one whose POST /videos has not landed yet, has no
 *     row pointing at it and is indistinguishable from an orphan.
 *   - The referenced-key set is loaded in full before any listing, and an empty
 *     or failed load aborts. Without that check a transient database failure
 *     would look like "nothing is referenced, delete everything".
 *   - Run it only after the delete fix is deployed, or the backlog refills
 *     behind you.
 *
 * Usage:
 *   npm run prisma:reclaim:orphan-portfolio-objects              # dry run
 *   RECLAIM_ORPHANS_APPLY=true npm run prisma:reclaim:orphan-portfolio-objects
 */
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  type _Object,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LOG_PREFIX = '[reclaim-orphan-portfolio-objects]';
const PREFIX = 'creator-portfolio/';
const DEFAULT_GRACE_HOURS = 48;
/** S3 DeleteObjects accepts at most 1000 keys per call. */
const DELETE_BATCH_SIZE = 1000;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function readApply(): boolean {
  return process.env.RECLAIM_ORPHANS_APPLY === 'true';
}

function readGraceHours(): number {
  const raw = process.env.RECLAIM_ORPHANS_GRACE_HOURS;
  if (!raw) return DEFAULT_GRACE_HOURS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid RECLAIM_ORPHANS_GRACE_HOURS: ${raw}`);
  }
  return parsed;
}

/** Which database and bucket this run is pointed at, for the log header. */
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

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/**
 * Every key any portfolio row points at. Loaded in one pass before listing,
 * because a partial read here would classify live objects as orphans.
 */
async function loadReferencedKeys(): Promise<Set<string>> {
  const rows = await prisma.creatorPortfolioVideo.findMany({
    select: { videoKey: true, thumbnailKey: true },
  });

  const keys = new Set<string>();
  for (const row of rows) {
    if (row.videoKey) keys.add(row.videoKey);
    if (row.thumbnailKey) keys.add(row.thumbnailKey);
  }

  if (rows.length === 0) {
    throw new Error(
      'Refusing to run: no CreatorPortfolioVideo rows were returned. An empty ' +
        'result cannot be distinguished from a failed read, and treating it as ' +
        'truth would delete every portfolio object in the bucket.',
    );
  }

  console.log(
    `${LOG_PREFIX} loaded ${keys.size} referenced key(s) from ${rows.length} row(s)`,
  );
  return keys;
}

/** Page through the prefix, yielding one page of objects at a time. */
async function* listPrefix(
  s3: S3Client,
  bucket: string,
): AsyncGenerator<_Object[]> {
  let continuationToken: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      }),
    );
    yield page.Contents ?? [];
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

async function deleteBatch(
  s3: S3Client,
  bucket: string,
  keys: string[],
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
    const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    deleted += batch.length - (res.Errors?.length ?? 0);
    for (const err of res.Errors ?? []) {
      console.warn(`${LOG_PREFIX} failed to delete ${err.Key}: ${err.Message}`);
    }
  }
  return deleted;
}

async function main(): Promise<void> {
  const apply = readApply();
  const graceHours = readGraceHours();
  const bucket = requireEnv('S3_BUCKET_NAME');
  const s3 = new S3Client({
    region: requireEnv('AWS_REGION'),
    credentials: {
      accessKeyId: requireEnv('AWS_S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_S3_SECRET_ACCESS_KEY'),
    },
  });

  console.log(
    `${LOG_PREFIX} starting apply=${apply} grace=${graceHours}h bucket=${bucket} (${dbFingerprint()})`,
  );
  if (!apply) {
    console.log(
      `${LOG_PREFIX} DRY RUN — nothing will be deleted. Set RECLAIM_ORPHANS_APPLY=true to act.`,
    );
  }

  const referenced = await loadReferencedKeys();
  const graceCutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);

  const orphans: string[] = [];
  let scanned = 0;
  let skippedRecent = 0;
  let orphanBytes = 0;

  for await (const page of listPrefix(s3, bucket)) {
    for (const object of page) {
      const key = object.Key;
      if (!key || key.endsWith('/')) continue;
      scanned++;

      if (referenced.has(key)) continue;

      // No row points at this key — but a very recent object is more likely an
      // upload still in flight than an orphan, so it is never a candidate.
      if (object.LastModified && object.LastModified > graceCutoff) {
        skippedRecent++;
        continue;
      }

      orphans.push(key);
      orphanBytes += object.Size ?? 0;
    }
  }

  console.log(
    `${LOG_PREFIX} scanned=${scanned} orphans=${orphans.length} ` +
      `skippedRecent=${skippedRecent} reclaimable=${formatBytes(orphanBytes)}`,
  );
  for (const key of orphans) {
    console.log(`${LOG_PREFIX} ${apply ? 'DELETE' : 'would delete'} ${key}`);
  }

  if (!apply || orphans.length === 0) {
    console.log(`${LOG_PREFIX} done (no changes made)`);
    return;
  }

  const deleted = await deleteBatch(s3, bucket, orphans);
  console.log(
    `${LOG_PREFIX} done — deleted ${deleted}/${orphans.length} object(s), ${formatBytes(orphanBytes)} reclaimed`,
  );
}

main()
  .catch((error) => {
    console.error(`${LOG_PREFIX} failed:`, error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
