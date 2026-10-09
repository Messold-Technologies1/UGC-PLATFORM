/**
 * Invalidate watermarked delivery previews so the fixed pipeline regenerates
 * them.
 *
 * Why: previews encoded before the `-loop 1` fix contain NO video stream — the
 * watermark overlay ended the filter graph at the first frame, so ffmpeg muxed
 * an audio-only MP4 and still exited 0. A brand opening such a delivery hears
 * the audio and sees nothing. `WatermarkService.watermarkDelivery` skips any
 * asset that already has a preview, so these never heal on their own; the
 * preview pointers have to be cleared first.
 *
 * Deploy the fixed pipeline FIRST. This only decides WHICH deliveries re-encode;
 * the encode itself runs whatever code is deployed, so running this before the
 * fix just regenerates the same broken files.
 *
 * Scope: only deliveries whose order has NOT been accepted. Once a brand accepts,
 * they get the original files and the preview is no longer shown, so there is
 * nothing to repair — and the reconcile backstop ignores accepted orders anyway.
 * Image previews are left alone: the bug was video-only (sharp, not ffmpeg).
 *
 * Crash-safe & resumable: clearing is idempotent, and each run only touches
 * deliveries that still carry a video preview, so the remaining count shrinks
 * every run.
 *
 * Usage (from server/, AFTER deploying the fixed pipeline):
 *   # dry run — prints what would be invalidated, changes nothing:
 *   node dist/scripts/invalidate-delivery-previews.js
 *   # actually invalidate (DB only; old S3 objects are left as orphans):
 *   APPLY=true node dist/scripts/invalidate-delivery-previews.js
 *   # also delete the old (broken) preview objects from S3:
 *   APPLY=true DELIVERY_PREVIEW_INVALIDATE_DELETE_OBJECTS=true \
 *     node dist/scripts/invalidate-delivery-previews.js
 *
 * Regeneration then happens on its own: the hourly reconcile backstop picks up
 * `pending` rows, and a brand opening the order re-drives it on read.
 *
 * Env:
 *   APPLY=true                                   execute (default dry-run)
 *   DELIVERY_PREVIEW_INVALIDATE_DELETE_OBJECTS   also delete the old S3 object
 *   DELIVERY_PREVIEW_INVALIDATE_BATCH            rows per page (default 100)
 * Requires the usual app env (DATABASE_URL, AWS_*, S3_BUCKET_NAME, CDN_BASE_URL).
 */
import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { envValidationSchema } from '../config/env.validation';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { StorageModule } from '../storage/storage.module';
import { StorageService } from '../storage/storage.service';

const APPLY = process.env.APPLY === 'true';
const DELETE_OBJECTS =
  process.env.DELIVERY_PREVIEW_INVALIDATE_DELETE_OBJECTS === 'true';

type DeliveryAsset = {
  key?: unknown;
  kind?: unknown;
  previewKey?: unknown;
  previewUrl?: unknown;
};

/** Video assets carrying a preview — the ones the broken encode produced. */
function videoPreviewKeys(assets: unknown): string[] {
  if (!Array.isArray(assets)) return [];
  return assets
    .filter((a): a is DeliveryAsset => typeof a === 'object' && a !== null)
    .filter((a) => a.kind === 'video' && typeof a.previewKey === 'string')
    .map((a) => a.previewKey as string);
}

/** The same assets with every VIDEO preview pointer cleared. */
function clearVideoPreviews(assets: unknown): unknown {
  if (!Array.isArray(assets)) return assets;
  // Through `unknown[]` so each element stays `unknown` rather than `any`:
  // this is untyped JSON out of the database, and it is only ever passed back
  // to the database, so nothing here should be trusted as a known shape.
  return (assets as unknown[]).map((a: unknown) => {
    if (typeof a !== 'object' || a === null) return a;
    const asset = a as DeliveryAsset;
    if (asset.kind !== 'video') return a;
    return { ...asset, previewKey: null, previewUrl: null };
  });
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
class InvalidateDeliveryPreviewsModule {}

async function main(): Promise<void> {
  const logger = new Logger('invalidate-delivery-previews');
  logger.log(
    APPLY
      ? `APPLY=true — preview pointers WILL be cleared${DELETE_OBJECTS ? ' and old S3 objects deleted' : ''}`
      : 'DRY RUN — no changes will be made (set APPLY=true to execute)',
  );

  const batchSize = Math.max(
    1,
    Number(process.env.DELIVERY_PREVIEW_INVALIDATE_BATCH) || 100,
  );

  const app = await NestFactory.createApplicationContext(
    InvalidateDeliveryPreviewsModule,
    { logger: ['error', 'warn', 'log'] },
  );
  const prisma = app.get(PrismaService);
  const storage = app.get(StorageService);

  // Previews only matter while the brand is still reviewing: an accepted order
  // shows the originals, and the reconcile backstop skips accepted orders too.
  const where = { order: { acceptedAt: null } };

  let scanned = 0;
  let invalidated = 0;
  let deleted = 0;
  let errors = 0;

  try {
    let cursor: string | undefined;
    for (;;) {
      const batch = await prisma.orderDelivery.findMany({
        where,
        select: { id: true, orderId: true, assets: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      for (const row of batch) {
        scanned++;
        const keys = videoPreviewKeys(row.assets);
        if (keys.length === 0) continue;
        invalidated++;
        if (!APPLY) {
          logger.log(
            `[dry-run] would invalidate delivery ${row.id} (order ${row.orderId}), ${keys.length} video preview(s)`,
          );
          continue;
        }
        try {
          // Clear the pointers FIRST so the delivery is genuinely owed a
          // preview; only then (optionally) drop the broken object.
          await prisma.orderDelivery.update({
            where: { id: row.id },
            data: {
              assets: clearVideoPreviews(row.assets) as never,
              previewStatus: 'pending',
              previewAttempts: 0,
              previewUpdatedAt: new Date(),
            },
          });
          if (DELETE_OBJECTS) {
            for (const key of keys) {
              await storage.deleteObjectIfExists(key).catch(() => undefined);
              deleted++;
            }
          }
        } catch (err) {
          errors++;
          logger.error(
            `invalidate failed for delivery ${row.id}: ${(err as Error)?.message}`,
          );
        }
      }

      logger.log(
        `progress: scanned ${scanned}, invalidated ${invalidated}${APPLY ? '' : ' [dry-run]'}`,
      );
    }

    logger.log(
      `${APPLY ? 'invalidate complete' : 'dry run complete'}: ${scanned} delivery(ies) scanned, ` +
        `${invalidated} invalidated, ${deleted} old object(s) deleted, ${errors} errors. ` +
        'Regeneration happens via the reconcile backstop and on brand read.',
    );
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('invalidate-delivery-previews crashed:', err);
    process.exit(1);
  });
