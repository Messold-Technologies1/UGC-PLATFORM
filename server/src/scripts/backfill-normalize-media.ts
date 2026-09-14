/**
 * Run-once backfill for creator video normalization (portfolio + intro).
 *
 * Transcodes every portfolio/intro video that isn't already a web-safe H.264/AAC
 * MP4 (downscaled + faststart, audio kept) and swaps it in place, so raw
 * HEVC/.mov uploads stop rendering black-with-audio in the drawer/profile.
 * Idempotent and safe to re-run: already-web-safe files are skipped, each row is
 * claimed atomically, and a failed row is retried on a re-run or by the cron.
 *
 * Usage (from server/):
 *   BULLMQ_WORKER_ENABLED=false npm run backfill:normalize-media
 *   # production (after `npm run build`):
 *   BULLMQ_WORKER_ENABLED=false node dist/scripts/backfill-normalize-media.js
 *
 * Env:
 *   NORMALIZE_BACKFILL_BATCH  rows fetched per page (default 25)
 *   PORTFOLIO_MAX_HEIGHT      downscale cap (default 720)
 *   FFMPEG_PATH               system ffmpeg (required on Alpine/musl)
 *   BULLMQ_WORKER_ENABLED     set 'false' so the script doesn't also start the
 *                             BullMQ worker — it encodes inline itself
 * Requires the usual app env (DATABASE_URL, AWS_*, S3_BUCKET_NAME, CDN_BASE_URL).
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { MediaNormalizeModule } from '../media-normalize/media-normalize.module';
import { MediaNormalizeQueueService } from '../media-normalize/media-normalize-queue.service';
import {
  NORMALIZE_STALE_PROCESSING_MS,
  introNormalizeOwedWhere,
  portfolioNormalizeOwedWhere,
} from '../media-normalize/media-normalize.reconcile';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    StorageModule,
    MediaNormalizeModule,
  ],
})
class NormalizeBackfillModule {}

async function main(): Promise<void> {
  const logger = new Logger('backfill-normalize-media');
  const batchSize = Math.max(
    1,
    Number(process.env.NORMALIZE_BACKFILL_BATCH) || 25,
  );

  const app = await NestFactory.createApplicationContext(
    NormalizeBackfillModule,
    { logger: ['error', 'warn', 'log'] },
  );
  const prisma = app.get(PrismaService);
  const queue = app.get(MediaNormalizeQueueService);
  const staleBefore = new Date(Date.now() - NORMALIZE_STALE_PROCESSING_MS);

  let processed = 0;
  let failed = 0;

  try {
    // Portfolio videos.
    const portfolioWhere = portfolioNormalizeOwedWhere(staleBefore);
    const portfolioTotal = await prisma.creatorPortfolioVideo.count({
      where: portfolioWhere,
    });
    logger.log(`backfill start: ${portfolioTotal} portfolio video(s) owed`);
    let cursor: string | undefined;
    for (;;) {
      const batch = await prisma.creatorPortfolioVideo.findMany({
        where: portfolioWhere,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      for (const v of batch) {
        try {
          await queue.processDirect('portfolio', v.id, 'backfill-script');
        } catch (err) {
          failed++;
          logger.error(
            `backfill: portfolio ${v.id} failed: ${(err as Error)?.message}`,
          );
        }
        processed++;
      }
      cursor = batch[batch.length - 1].id;
      logger.log(
        `backfill progress (portfolio): ${processed} (${failed} failed)`,
      );
    }

    // Intro videos.
    const introWhere = introNormalizeOwedWhere(staleBefore);
    const introTotal = await prisma.creatorProfile.count({ where: introWhere });
    logger.log(`backfill start: ${introTotal} intro video(s) owed`);
    let introCursor: string | undefined;
    let introProcessed = 0;
    for (;;) {
      const batch = await prisma.creatorProfile.findMany({
        where: introWhere,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(introCursor ? { cursor: { id: introCursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      for (const c of batch) {
        try {
          await queue.processDirect('intro', c.id, 'backfill-script');
        } catch (err) {
          failed++;
          logger.error(
            `backfill: intro ${c.id} failed: ${(err as Error)?.message}`,
          );
        }
        introProcessed++;
      }
      introCursor = batch[batch.length - 1].id;
      logger.log(
        `backfill progress (intro): ${introProcessed} (${failed} failed)`,
      );
    }

    logger.log(
      `backfill complete: portfolio=${processed} intro=${introProcessed} failed=${failed}`,
    );
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('backfill-normalize-media crashed:', err);
    process.exit(1);
  });
