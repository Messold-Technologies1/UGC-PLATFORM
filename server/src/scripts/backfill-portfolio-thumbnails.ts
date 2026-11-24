/**
 * Run-once backfill for portfolio poster images.
 *
 * Every `CreatorPortfolioVideo` with an object in S3 but no `thumbnailKey` gets
 * a JPEG of one frame, uploaded next to the reel and recorded on the row. The
 * video bytes are never touched — this only adds a still.
 *
 * Why: without a poster, every surface that lists reels (the admin creators
 * list, the portfolio preview modal, the public profile grid) has to mount a
 * `<video>` per tile just to paint a frame. Safari ignores `preload="metadata"`
 * and keeps buffering, so a six-reel carousel pulled hundreds of megabytes and
 * the larger files never decoded a first frame at all — a blank player and
 * black thumbnails, while Chrome looked fine.
 *
 * Reads only the head of each object where it can (a faststart MP4 keeps its
 * index up front), falling back to the whole object when that is not enough.
 * Idempotent and safe to re-run: a row that already has a thumbnail is skipped,
 * and a row that fails is simply picked up again on the next run.
 *
 * Usage (from server/):
 *   # production (the deployed image already has dist/):
 *   BULLMQ_WORKER_ENABLED=false npm run backfill:portfolio-thumbnails
 *   # dev, without a build:
 *   BULLMQ_WORKER_ENABLED=false node -r ts-node/register/transpile-only src/scripts/backfill-portfolio-thumbnails.ts
 *
 * Env:
 *   POSTER_BACKFILL_BATCH         rows fetched per page (default 50)
 *   POSTER_BACKFILL_LIMIT         stop after this many rows (default: no limit)
 *   PORTFOLIO_POSTER_HEIGHT       poster height in px (default 720)
 *   PORTFOLIO_POSTER_PROBE_BYTES  head bytes read per reel (default 12 MiB)
 *   FFMPEG_PATH                   system ffmpeg (required on Alpine/musl)
 *   BULLMQ_WORKER_ENABLED         set 'false' so the script doesn't also start
 *                                 the BullMQ worker — it encodes inline itself
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
import { MediaNormalizeService } from '../media-normalize/media-normalize.service';

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
class PosterBackfillModule {}

async function main(): Promise<void> {
  const logger = new Logger('backfill-portfolio-thumbnails');
  const batchSize = Math.max(
    1,
    Number(process.env.POSTER_BACKFILL_BATCH) || 50,
  );
  const limit = Number(process.env.POSTER_BACKFILL_LIMIT) || Infinity;

  const app = await NestFactory.createApplicationContext(PosterBackfillModule, {
    logger: ['error', 'warn', 'log'],
  });
  const prisma = app.get(PrismaService);
  const normalize = app.get(MediaNormalizeService);

  // `videoKey: { not: null }` alone would also match LINK_ONLY Instagram rows
  // once their mirror lands, which is fine — those have an object too.
  const where = {
    thumbnailKey: null,
    videoKey: { not: null },
  } as const;

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let seen = 0;

  try {
    const total = await prisma.creatorPortfolioVideo.count({ where });
    logger.log(`backfill start: ${total} portfolio video(s) without a poster`);

    let cursor: string | undefined;
    for (;;) {
      if (seen >= limit) break;
      const batch = await prisma.creatorPortfolioVideo.findMany({
        where,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;

      for (const v of batch) {
        if (seen >= limit) break;
        seen++;
        try {
          const result = await normalize.backfillPortfolioPoster(v.id);
          if (result === 'created') created++;
          else skipped++;
        } catch (err) {
          failed++;
          logger.error(
            `backfill: portfolio ${v.id} poster failed: ${(err as Error)?.message}`,
          );
        }
      }
      cursor = batch[batch.length - 1].id;
      logger.log(
        `backfill progress: ${seen}/${total} (${created} created, ${skipped} skipped, ${failed} failed)`,
      );
    }

    logger.log(
      `backfill done: ${created} created, ${skipped} skipped, ${failed} failed`,
    );
  } finally {
    await app.close();
  }

  // A non-zero exit makes a partial run visible to whatever invoked it; the
  // rows that failed are still owed and a re-run picks them up.
  if (failed > 0) process.exitCode = 1;
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
