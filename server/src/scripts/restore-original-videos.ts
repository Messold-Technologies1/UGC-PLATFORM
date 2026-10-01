/**
 * Recover the ORIGINAL (full-resolution) creator videos that the earlier
 * downscale-to-720p normalization overwrote and deleted.
 *
 * Background: a previous version of MediaNormalizeService transcoded every
 * portfolio/intro video above 720p, uploaded the smaller file under a NEW S3
 * key, repointed the DB row, and then DELETED the original object. The bucket
 * has versioning enabled, so each "delete" only added a delete marker — the
 * original bytes still exist as a noncurrent version. This script finds those
 * deleted originals, restores them, and repoints the DB rows back to full
 * resolution.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * RUN ORDER MATTERS:
 *   1. Deploy PR #331 first (the no-downscale pipeline). This script resets the
 *      restored rows to `videoNormalizeStatus = null` so the pipeline re-checks
 *      them — with the OLD code still deployed that would just re-downscale them
 *      again. Deploy the fix, THEN run this.
 *   2. Run in DRY-RUN first (default) and read the plan. Only then re-run with
 *      APPLY=true.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Matching a deleted original to its DB row:
 *   - PRIMARY (exact): the row's `contentHash` is the SHA-256 of the originally
 *     uploaded bytes, so we hash each deleted version and match it to the row
 *     with the same hash. `@@unique([creatorId, contentHash])` makes this 1:1.
 *   - FALLBACK (approximate): rows with no `contentHash` (older uploads, Brand
 *     Collab copies) are paired within a creator by nearest timestamp
 *     (row.videoNormalizeUpdatedAt ↔ the delete marker's time), only when the
 *     leftover counts line up. A mispair here can only ever swap one of the
 *     creator's OWN originals for another — never another creator's — and is
 *     logged as TIMESTAMP confidence so you can eyeball it.
 *   - Anything still ambiguous is printed as MANUAL and left untouched.
 *
 * Restore is crash-safe and resumable: we repoint the row to the original key
 * first, then remove the delete marker. A run interrupted between the two leaves
 * the original still delete-marked, so a re-run rediscovers and finishes it.
 *
 * Usage (from server/, after deploying PR #331):
 *   # dry run — prints the plan, changes nothing:
 *   node dist/scripts/restore-original-videos.js
 *   # actually restore:
 *   APPLY=true node dist/scripts/restore-original-videos.js
 *
 * Re-runs & the delete-marker cutoff (IMPORTANT for reconnects):
 *   When this script restores a video it also DELETES the old downscaled file.
 *   The bucket is versioned, so that delete only adds a NEW delete marker — which
 *   looks exactly like a "deleted original" to the next scan. Without a cutoff a
 *   re-run would (a) re-count those tombstones (the "remaining" number climbs
 *   instead of dropping) and (b) risk matching them back to already-restored rows
 *   and undoing the recovery. Set RESTORE_ORIGINALS_DELETED_BEFORE to an instant
 *   just before your FIRST restore run: the real originals were deleted by the old
 *   normalization long before that, so anything delete-marked at/after it is this
 *   script's own cleanup and is ignored. Exact contentHash (HASH) restores are
 *   always safe; timestamp and intro restores only run when the cutoff is set.
 *
 * Env:
 *   APPLY=true                        execute (default dry-run)
 *   RESTORE_ORIGINALS_DELETED_BEFORE  ISO instant; ignore delete markers at/after
 *                                     it (this script's own cleanup). Strongly
 *                                     recommended for any re-run. Enables the
 *                                     timestamp + intro restore paths.
 * Needs the usual app env (DATABASE_URL, AWS_*, S3_BUCKET_NAME, CDN_BASE_URL).
 */
import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';

const APPLY = process.env.APPLY === 'true';

// Delete markers created at/after this instant are treated as tombstones this
// restore itself produced (deleting the old downscaled file after repointing the
// row), NOT as originals to recover. Set it to just before your first restore run
// so re-runs after a reconnect don't re-count — or worse, "restore" — the files
// this script deleted. When unset, only exact-content (HASH) portfolio restores
// run; timestamp and intro restores are held back for safety.
const DELETED_BEFORE = process.env.RESTORE_ORIGINALS_DELETED_BEFORE
  ? new Date(process.env.RESTORE_ORIGINALS_DELETED_BEFORE)
  : null;
if (DELETED_BEFORE && Number.isNaN(DELETED_BEFORE.getTime())) {
  throw new Error(
    `RESTORE_ORIGINALS_DELETED_BEFORE is not a valid date: ${process.env.RESTORE_ORIGINALS_DELETED_BEFORE}`,
  );
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    StorageModule,
  ],
})
class RestoreModule {}

interface DeletedOriginal {
  key: string;
  deleteMarkerVersionId: string;
  dataVersionId: string;
  deletedAt: number; // delete-marker LastModified (ms)
}

async function streamToBuffer(body: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(
      typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk),
    );
  }
  return Buffer.concat(chunks);
}

async function main(): Promise<void> {
  const logger = new Logger('restore-original-videos');
  logger.log(
    APPLY
      ? 'APPLY=true — changes WILL be written to S3 and the database'
      : 'DRY RUN — no changes will be made (set APPLY=true to execute)',
  );
  if (DELETED_BEFORE) {
    logger.log(
      `only recovering originals deleted before ${DELETED_BEFORE.toISOString()} — ` +
        "newer delete markers are treated as this script's own cleanup",
    );
  } else {
    logger.warn(
      'RESTORE_ORIGINALS_DELETED_BEFORE is not set. On a re-run the "remaining" ' +
        'count will include the downscaled files this script already deleted, and ' +
        'timestamp + intro restores are disabled for safety (only exact contentHash ' +
        'matches restore). Set it to just before your first restore run for an ' +
        'accurate count and to re-enable those paths.',
    );
  }

  const app = await NestFactory.createApplicationContext(RestoreModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const storage = app.get(StorageService);
  const s3: S3Client = storage.rawClient();
  const bucket = storage.bucketName();

  const stats = {
    restored: 0,
    byHash: 0,
    byTimestamp: 0,
    repaired: 0,
    manual: 0,
    errors: 0,
  };

  /** All keys under `prefix` whose latest version is a delete marker (i.e. the
   *  object we deleted), with the version id needed to undelete + the newest
   *  surviving data version. */
  async function listDeletedOriginals(
    prefix: string,
  ): Promise<DeletedOriginal[]> {
    const versionsByKey = new Map<
      string,
      {
        data: { versionId: string; at: number }[];
        latestMarker: { versionId: string; at: number } | null;
      }
    >();

    let keyMarker: string | undefined;
    let versionIdMarker: string | undefined;
    for (;;) {
      const res = await s3.send(
        new ListObjectVersionsCommand({
          Bucket: bucket,
          Prefix: prefix,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        }),
      );
      for (const v of res.Versions ?? []) {
        if (!v.Key || !v.VersionId) continue;
        const e = versionsByKey.get(v.Key) ?? { data: [], latestMarker: null };
        e.data.push({
          versionId: v.VersionId,
          at: v.LastModified?.getTime() ?? 0,
        });
        versionsByKey.set(v.Key, e);
      }
      for (const m of res.DeleteMarkers ?? []) {
        if (!m.Key || !m.VersionId) continue;
        const e = versionsByKey.get(m.Key) ?? { data: [], latestMarker: null };
        if (m.IsLatest) {
          e.latestMarker = {
            versionId: m.VersionId,
            at: m.LastModified?.getTime() ?? 0,
          };
        }
        versionsByKey.set(m.Key, e);
      }
      if (!res.IsTruncated) break;
      keyMarker = res.NextKeyMarker;
      versionIdMarker = res.NextVersionIdMarker;
    }

    // Return EVERY delete-marked key (cutoff is applied by the caller). Repair
    // needs the full set — a row pointing at a key the cutoff would hide still
    // has to be undeleted.
    const out: DeletedOriginal[] = [];
    for (const [key, e] of versionsByKey) {
      if (!e.latestMarker || e.data.length === 0) continue; // live, or no bytes to restore
      const newest = e.data.sort((a, b) => b.at - a.at)[0];
      out.push({
        key,
        deleteMarkerVersionId: e.latestMarker.versionId,
        dataVersionId: newest.versionId,
        deletedAt: e.latestMarker.at,
      });
    }
    return out;
  }

  /** Delete markers older than the cutoff are genuine originals deleted by the
   *  old normalization; newer ones are this restore's own cleanup tombstones. */
  function isRestorable(d: DeletedOriginal): boolean {
    return !DELETED_BEFORE || d.deletedAt < DELETED_BEFORE.getTime();
  }

  async function hashVersion(key: string, versionId: string): Promise<string> {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key, VersionId: versionId }),
    );
    const buf = await streamToBuffer(res.Body as Readable);
    return createHash('sha256').update(buf).digest('hex');
  }

  /** Undelete: removing the delete marker makes the prior data version current. */
  async function undelete(orig: DeletedOriginal): Promise<void> {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: orig.key,
        VersionId: orig.deleteMarkerVersionId,
      }),
    );
  }

  // ── Phase 1: discover every deleted original up front (one listing pass) ──
  // so we can report how many are still owed before touching anything. Each run
  // only ever finds originals that STILL have a delete marker, so this number
  // shrinks every run and is your resume/progress gauge.
  const portfolioCreatorIds = (
    await prisma.creatorPortfolioVideo.findMany({
      select: { creatorId: true },
      distinct: ['creatorId'],
    })
  ).map((r) => r.creatorId);

  const portfolioByCreator = new Map<string, DeletedOriginal[]>();
  for (const creatorId of portfolioCreatorIds) {
    const prefix = `creator-portfolio/${creatorId}/videos/`;
    try {
      const deleted = await listDeletedOriginals(prefix);
      if (deleted.length > 0) portfolioByCreator.set(creatorId, deleted);
    } catch (err) {
      stats.errors++;
      logger.error(`list failed for ${prefix}: ${(err as Error)?.message}`);
    }
  }

  const introCreators = await prisma.creatorProfile.findMany({
    where: { introVideoKey: { not: null } },
    select: { id: true, introVideoKey: true },
  });
  const introByCreator = new Map<
    string,
    { introVideoKey: string | null; deleted: DeletedOriginal[] }
  >();
  for (const c of introCreators) {
    const prefix = `creator-profile/${c.id}/intro/`;
    try {
      const deleted = await listDeletedOriginals(prefix);
      if (deleted.length > 0)
        introByCreator.set(c.id, { introVideoKey: c.introVideoKey, deleted });
    } catch (err) {
      stats.errors++;
      logger.error(`list failed for ${prefix}: ${(err as Error)?.message}`);
    }
  }

  const portfolioRemaining = [...portfolioByCreator.values()].reduce(
    (n, d) => n + d.filter(isRestorable).length,
    0,
  );
  const introRemaining = [...introByCreator.values()].reduce(
    (n, e) => n + e.deleted.filter(isRestorable).length,
    0,
  );
  const totalRemaining = portfolioRemaining + introRemaining;
  let processed = 0;
  logger.log(
    `remaining to restore: ${totalRemaining} deleted original(s) — ` +
      `${portfolioRemaining} portfolio across ${portfolioByCreator.size} creator(s), ` +
      `${introRemaining} intro across ${introByCreator.size} creator(s)`,
  );
  if (totalRemaining === 0) {
    logger.log('nothing left to restore — all originals are already live');
  }

  // ── Phase 2: restore ──────────────────────────────────────────────────────
  for (const [creatorId, deleted] of portfolioByCreator) {
    const rows = await prisma.creatorPortfolioVideo.findMany({
      where: { creatorId },
      select: {
        id: true,
        videoKey: true,
        contentHash: true,
        videoNormalizeUpdatedAt: true,
      },
    });

    // REPAIR: finish interrupted restores. A row already repointed to an
    // original whose delete marker was never removed (crash/kill between repoint
    // and undelete) serves a 403 — the DB advertises a key S3 still considers
    // deleted. Just undelete it; the row already claims this exact key, so no
    // matching is needed and the cutoff doesn't apply.
    const repairedKeys = new Set<string>();
    for (const row of rows) {
      if (!row.videoKey) continue;
      const marked = deleted.find((d) => d.key === row.videoKey);
      if (!marked) continue;
      repairedKeys.add(marked.key);
      stats.repaired++;
      logger.log(
        `REPAIR: ${marked.key} → row ${row.id} repointed but still delete-marked; undeleting${APPLY ? '' : ' [dry-run]'}`,
      );
      if (APPLY) {
        await undelete(marked).catch((err) => {
          stats.errors++;
          logger.error(
            `repair undelete failed for ${marked.key}: ${(err as Error)?.message}`,
          );
        });
        await prisma.creatorProfile
          .update({
            where: { id: creatorId },
            data: { previewVideoStatus: 'pending', previewVideoAttempts: 0 },
          })
          .catch(() => undefined);
      }
    }

    // Rows already pointing at a (now-repaired) key are done; restore only the
    // rest, and only against genuine pre-campaign originals.
    const remainingRows = rows.filter(
      (r) => !(r.videoKey && repairedKeys.has(r.videoKey)),
    );
    const remainingDeleted = deleted.filter(
      (d) => isRestorable(d) && !repairedKeys.has(d.key),
    );

    // PRIMARY: exact contentHash match.
    for (const orig of [...remainingDeleted]) {
      let hash: string;
      try {
        hash = await hashVersion(orig.key, orig.dataVersionId);
      } catch (err) {
        stats.errors++;
        logger.error(`hash failed for ${orig.key}: ${(err as Error)?.message}`);
        continue;
      }
      const rowIdx = remainingRows.findIndex((r) => r.contentHash === hash);
      if (rowIdx === -1) continue;
      const row = remainingRows[rowIdx];
      remainingRows.splice(rowIdx, 1);
      remainingDeleted.splice(remainingDeleted.indexOf(orig), 1);
      await restorePortfolio(creatorId, row, orig, 'HASH');
    }

    // FALLBACK: single unambiguous leftover, or nearest-timestamp pairing.
    const restoreCandidates = remainingRows.filter(
      (r) => r.videoKey && !deleted.some((d) => d.key === r.videoKey),
    );
    if (remainingDeleted.length > 0) {
      if (
        DELETED_BEFORE &&
        remainingDeleted.length === restoreCandidates.length &&
        restoreCandidates.length > 0
      ) {
        // Pair each leftover original to the row whose normalize time is closest.
        // Only safe with a cutoff set, so this script's own delete tombstones are
        // already excluded and can't be paired back onto restored rows.
        const pool = [...restoreCandidates];
        for (const orig of remainingDeleted) {
          pool.sort(
            (a, b) =>
              Math.abs(
                (a.videoNormalizeUpdatedAt?.getTime() ?? 0) - orig.deletedAt,
              ) -
              Math.abs(
                (b.videoNormalizeUpdatedAt?.getTime() ?? 0) - orig.deletedAt,
              ),
          );
          const row = pool.shift()!;
          await restorePortfolio(creatorId, row, orig, 'TIMESTAMP');
        }
      } else {
        for (const orig of remainingDeleted) {
          stats.manual++;
          logger.warn(
            `MANUAL: ${orig.key} (creator ${creatorId}) — ${
              !DELETED_BEFORE
                ? 'timestamp matching disabled (set RESTORE_ORIGINALS_DELETED_BEFORE to enable)'
                : `no contentHash match and leftover counts don't line up (${remainingDeleted.length} originals vs ${restoreCandidates.length} rows)`
            }`,
          );
        }
      }
    }
  }

  function countRestore(confidence: 'HASH' | 'TIMESTAMP'): void {
    stats.restored++;
    if (confidence === 'HASH') stats.byHash++;
    else stats.byTimestamp++;
  }

  async function restorePortfolio(
    creatorId: string,
    row: { id: string; videoKey: string | null; contentHash: string | null },
    orig: DeletedOriginal,
    confidence: 'HASH' | 'TIMESTAMP',
  ): Promise<void> {
    const staleKey = row.videoKey;
    if (staleKey === orig.key) {
      // Already repointed (a prior interrupted run) — just make sure it's live.
      logger.log(
        `${confidence}: ${orig.key} already repointed; ensuring undeleted`,
      );
      if (APPLY) await undelete(orig).catch(() => undefined);
      return;
    }
    processed++;
    logger.log(
      `${confidence}: restore ${orig.key} → row ${row.id} (${processed}/${totalRemaining})${APPLY ? '' : ' [dry-run]'}`,
    );
    if (!APPLY) {
      countRestore(confidence);
      return;
    }
    try {
      // 1) Repoint the row FIRST (crash-safe: if we die before undelete, the
      //    original is still delete-marked and a re-run rediscovers it).
      await prisma.creatorPortfolioVideo.update({
        where: { id: row.id },
        data: {
          videoKey: orig.key,
          videoUrl: storage.buildCdnUrl(orig.key),
          videoNormalizeStatus: null,
          videoNormalizeAttempts: 0,
        },
      });
      // 2) Undelete the original.
      await undelete(orig);
      // 3) Drop the downscaled object (versioning keeps a copy anyway).
      if (staleKey)
        await storage.deleteObjectIfExists(staleKey).catch(() => undefined);
      // 4) Regenerate the card preview from the restored source.
      await prisma.creatorProfile
        .update({
          where: { id: creatorId },
          data: { previewVideoStatus: 'pending', previewVideoAttempts: 0 },
        })
        .catch(() => undefined);
      countRestore(confidence);
    } catch (err) {
      stats.errors++;
      logger.error(
        `restore failed for ${orig.key}: ${(err as Error)?.message}`,
      );
    }
  }

  // ── Phase 2 (intro) ────────────────────────────────────────────────────
  for (const [introCreatorId, entry] of introByCreator) {
    const c = { id: introCreatorId, introVideoKey: entry.introVideoKey };

    // REPAIR: the profile already points at this intro key but it's still
    // delete-marked (interrupted restore → 403). Undelete it; no matching or
    // cutoff needed, the profile already claims this exact key.
    const markedCurrent = c.introVideoKey
      ? entry.deleted.find((d) => d.key === c.introVideoKey)
      : undefined;
    if (markedCurrent) {
      stats.repaired++;
      logger.log(
        `REPAIR (intro): ${markedCurrent.key} → creator ${c.id} repointed but still delete-marked; undeleting${APPLY ? '' : ' [dry-run]'}`,
      );
      if (APPLY) {
        await undelete(markedCurrent).catch((err) => {
          stats.errors++;
          logger.error(
            `repair undelete failed for ${markedCurrent.key}: ${(err as Error)?.message}`,
          );
        });
        await prisma.creatorProfile
          .update({
            where: { id: c.id },
            data: { previewVideoStatus: 'pending', previewVideoAttempts: 0 },
          })
          .catch(() => undefined);
      }
      continue;
    }

    // RESTORE: one intro per creator; the most recently deleted RESTORABLE
    // original is the pre-swap intro we want back.
    const restorable = entry.deleted.filter(isRestorable);
    if (restorable.length === 0) continue;
    const orig = restorable.sort((a, b) => b.deletedAt - a.deletedAt)[0];
    // Without a cutoff, "most recently deleted" could be this script's own
    // tombstone (deleting the old downscaled intro), which is always newer than
    // the genuine original — restoring it would re-break the intro. Hold back.
    if (!DELETED_BEFORE) {
      stats.manual++;
      logger.warn(
        `MANUAL (intro): ${orig.key} → creator ${c.id} — set RESTORE_ORIGINALS_DELETED_BEFORE to enable intro restore safely`,
      );
      continue;
    }
    processed++;
    logger.log(
      `INTRO: restore ${orig.key} → creator ${c.id} (was ${c.introVideoKey}) (${processed}/${totalRemaining})${APPLY ? '' : ' [dry-run]'}`,
    );
    if (!APPLY) {
      stats.restored++;
      continue;
    }
    try {
      const staleKey = c.introVideoKey;
      await prisma.creatorProfile.update({
        where: { id: c.id },
        data: {
          introVideoKey: orig.key,
          introVideoUrl: storage.buildCdnUrl(orig.key),
          introVideoNormalizeStatus: null,
          introVideoNormalizeAttempts: 0,
          previewVideoStatus: 'pending',
          previewVideoAttempts: 0,
        },
      });
      await undelete(orig);
      if (staleKey)
        await storage.deleteObjectIfExists(staleKey).catch(() => undefined);
      stats.restored++;
    } catch (err) {
      stats.errors++;
      logger.error(
        `intro restore failed for ${c.id}: ${(err as Error)?.message}`,
      );
    }
  }

  logger.log(
    `${APPLY ? 'restore complete' : 'dry run complete'}: ${stats.restored} restored ` +
      `(hash=${stats.byHash} timestamp=${stats.byTimestamp}), ${stats.repaired} repaired ` +
      `(interrupted undelete), ${stats.manual} need manual review, ${stats.errors} errors`,
  );
  await app.close();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('restore-original-videos crashed:', err);
    process.exit(1);
  });
