/**
 * Run-once backfill for creator card previews.
 *
 * Generates the faststart + downscaled card-preview rendition for every listed
 * creator that owes one (see previewReconcileWhere) — i.e. everyone who predates
 * the feature — draining the whole set immediately instead of waiting for the
 * twice-monthly reconcile cron to drip through it. Idempotent and safe to re-run:
 * creators already `ready` are skipped, and each row is claimed atomically so a
 * concurrently-running app/worker never double-encodes.
 *
 * Usage (from server/):
 *   # dev / one-off, no build needed:
 *   BULLMQ_WORKER_ENABLED=false npm run backfill:preview-videos
 *
 *   # production (after `npm run build`):
 *   BULLMQ_WORKER_ENABLED=false node dist/scripts/backfill-preview-videos.js
 *
 * Env:
 *   PREVIEW_BACKFILL_BATCH   rows fetched per page (default 25)
 *   FFMPEG_PATH              system ffmpeg (required on Alpine/musl)
 *   BULLMQ_WORKER_ENABLED    set 'false' so the script doesn't also spin up the
 *                            BullMQ worker — the script encodes inline itself
 * Requires the usual app env (DATABASE_URL, AWS_*, S3_BUCKET_NAME, CDN_BASE_URL).
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { PreviewVideoModule } from '../preview-video/preview-video.module';
import { PreviewVideoQueueService } from '../preview-video/preview-video-queue.service';
import { previewReconcileWhere } from '../preview-video/preview-reconcile.where';

/** Matches JobsService's stale-processing window so both agree on "owed". */
const STALE_PROCESSING_MS = 600_000;

// A minimal context — just the deps the preview pipeline needs — so the script
// doesn't boot the HTTP server, sockets, mail, or the other job queues.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    StorageModule,
    PreviewVideoModule,
  ],
})
class PreviewBackfillModule {}

async function main(): Promise<void> {
  const logger = new Logger('backfill-preview-videos');
  const batchSize = Math.max(
    1,
    Number(process.env.PREVIEW_BACKFILL_BATCH) || 25,
  );

  const app = await NestFactory.createApplicationContext(
    PreviewBackfillModule,
    {
      logger: ['error', 'warn', 'log'],
    },
  );
  const prisma = app.get(PrismaService);
  const previewQueue = app.get(PreviewVideoQueueService);

  const where = previewReconcileWhere(
    new Date(Date.now() - STALE_PROCESSING_MS),
  );
  let cursor: string | undefined;
  let processed = 0;
  let failed = 0;

  try {
    const total = await prisma.creatorProfile.count({ where });
    logger.log(
      `backfill start: ${total} creator(s) owe a card preview (batch=${batchSize})`,
    );

    for (;;) {
      // Cursor-page by id: process the whole owed set exactly once per run. A row
      // that fails is left `failed` behind the cursor and retried on a re-run or
      // by the reconcile cron, so the loop can't spin on it.
      const batch = await prisma.creatorProfile.findMany({
        where,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;

      for (const c of batch) {
        try {
          await previewQueue.processCreatorDirect(c.id, 'backfill-script');
        } catch (err) {
          failed++;
          logger.error(
            `backfill: creator ${c.id} failed: ${(err as Error)?.message}`,
          );
        }
        processed++;
      }
      cursor = batch[batch.length - 1].id;
      logger.log(
        `backfill progress: ${processed} processed (${failed} failed)`,
      );
    }

    logger.log(`backfill complete: ${processed} processed, ${failed} failed`);
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('backfill-preview-videos crashed:', err);
    process.exit(1);
  });
