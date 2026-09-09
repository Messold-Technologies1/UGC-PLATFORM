/**
 * Backfill: publish the approved final video of every already-completed order
 * into that creator's portfolio as a "Brand Collab" tile.
 *
 * This is the one-time catch-up for orders that were accepted before the
 * auto-publish hook shipped. It mirrors, exactly, what OrderPortfolioSyncService
 * does at accept time — but self-contained (no `src/` import), so it also runs
 * inside the production container, which ships only `dist/`. The two must stay
 * in step: the S3 key shape, the "final = highest revision" rule, and the
 * (creatorId, sourceOrderId) idempotency all match the service.
 *
 * Safety:
 *   - Dry run unless BACKFILL_ORDER_PORTFOLIO_APPLY=true. The default prints what
 *     it would create and exits.
 *   - Idempotent: an order that already has a collab tile is skipped, so
 *     re-running (or racing the live accept hook) never double-publishes. The
 *     unique index is the backstop.
 *   - The video object is COPIED, never moved: the order keeps its own object.
 *
 * After an apply run, run `npm run prisma:backfill:recompute-listing` to fold the
 * new public videos into the go-live counts. (Adding a public video only ever
 * raises the count, so no creator can go offline from this.)
 *
 * Usage:
 *   npm run prisma:backfill:order-portfolio-videos                     # dry run
 *   BACKFILL_ORDER_PORTFOLIO_APPLY=true npm run prisma:backfill:order-portfolio-videos
 */
import { randomUUID } from 'node:crypto';
import {
  PortfolioVideoAssetState,
  PortfolioVideoSource,
  PortfolioVisibilityStatus,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { CopyObjectCommand, S3Client } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();
const LOG_PREFIX = '[backfill-order-videos-to-portfolio]';
/** Process orders in pages so a large table never loads into memory at once. */
const PAGE_SIZE = 200;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

function readApply(): boolean {
  return process.env.BACKFILL_ORDER_PORTFOLIO_APPLY === 'true';
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

/** First playable video key in a delivery's assets, tolerating loose JSON. */
function pickVideoKey(assets: Prisma.JsonValue | null): string | null {
  if (!Array.isArray(assets)) return null;
  const keyOf = (a: any): string | null =>
    a && typeof a.key === 'string' && a.key.trim() ? a.key : null;
  for (const a of assets as any[]) {
    if (a?.kind === 'video') {
      const key = keyOf(a);
      if (key) return key;
    }
  }
  for (const a of assets as any[]) {
    const key = keyOf(a);
    if (key) return key;
  }
  return null;
}

interface Ctx {
  apply: boolean;
  s3: S3Client;
  bucket: string;
  cdnBaseUrl: string;
}

interface Totals {
  scanned: number;
  alreadySynced: number;
  created: number;
  wouldCreate: number;
  skippedNoDelivery: number;
  skippedNoVideo: number;
  errors: number;
}

async function processOrder(
  ctx: Ctx,
  order: { id: string; creatorId: string },
  totals: Totals,
): Promise<void> {
  // Idempotent: skip orders that already have a collab tile.
  const existing = await prisma.creatorPortfolioVideo.findUnique({
    where: {
      creatorId_sourceOrderId: {
        creatorId: order.creatorId,
        sourceOrderId: order.id,
      },
    },
    select: { id: true },
  });
  if (existing) {
    totals.alreadySynced++;
    return;
  }

  const delivery = await prisma.orderDelivery.findFirst({
    where: { orderId: order.id },
    orderBy: { revisionNumber: 'desc' },
    select: { id: true, assets: true },
  });
  if (!delivery) {
    totals.skippedNoDelivery++;
    return;
  }

  const sourceKey = pickVideoKey(delivery.assets);
  if (!sourceKey) {
    totals.skippedNoVideo++;
    return;
  }

  if (!ctx.apply) {
    totals.wouldCreate++;
    console.log(
      `${LOG_PREFIX} would publish order ${order.id} (creator ${order.creatorId}) from ${sourceKey}`,
    );
    return;
  }

  const ext = sourceKey.split('.').pop()?.toLowerCase();
  if (!ext || ext.includes('/')) {
    totals.skippedNoVideo++;
    console.warn(
      `${LOG_PREFIX} order ${order.id}: source key has no extension (${sourceKey})`,
    );
    return;
  }
  const destKey = `creator-portfolio/${order.creatorId}/videos/${randomUUID()}.${ext}`;

  await ctx.s3.send(
    new CopyObjectCommand({
      Bucket: ctx.bucket,
      Key: destKey,
      CopySource: `${ctx.bucket}/${sourceKey}`,
    }),
  );

  try {
    await prisma.creatorPortfolioVideo.create({
      data: {
        creatorId: order.creatorId,
        source: PortfolioVideoSource.ORDER,
        sourceOrderId: order.id,
        sourceDeliveryId: delivery.id,
        visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
        assetState: PortfolioVideoAssetState.READY,
        videoKey: destKey,
        videoUrl: `${ctx.cdnBaseUrl}/${destKey}`,
      },
    });
    totals.created++;
  } catch (err) {
    // The live accept hook may have won the race between our findUnique and
    // create. That is a success, not a failure — the tile exists.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      totals.alreadySynced++;
      return;
    }
    throw err;
  }
}

async function main(): Promise<void> {
  const apply = readApply();
  const bucket = requireEnv('S3_BUCKET_NAME');
  const cdnBaseUrl = requireEnv('CDN_BASE_URL').replace(/\/+$/, '');
  const s3 = new S3Client({
    region: requireEnv('AWS_REGION'),
    credentials: {
      accessKeyId: requireEnv('AWS_S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('AWS_S3_SECRET_ACCESS_KEY'),
    },
  });
  const ctx: Ctx = { apply, s3, bucket, cdnBaseUrl };

  console.log(
    `${LOG_PREFIX} starting apply=${apply} bucket=${bucket} (${dbFingerprint()})`,
  );
  if (!apply) {
    console.log(
      `${LOG_PREFIX} DRY RUN — nothing will be written. Set BACKFILL_ORDER_PORTFOLIO_APPLY=true to act.`,
    );
  }

  const totals: Totals = {
    scanned: 0,
    alreadySynced: 0,
    created: 0,
    wouldCreate: 0,
    skippedNoDelivery: 0,
    skippedNoVideo: 0,
    errors: 0,
  };

  // Page by createdAt cursor over accepted orders only.
  let cursor: string | undefined;
  for (;;) {
    const orders = await prisma.order.findMany({
      where: { acceptedAt: { not: null } },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: { id: true, creatorId: true },
    });
    if (orders.length === 0) break;
    cursor = orders[orders.length - 1].id;

    for (const order of orders) {
      totals.scanned++;
      try {
        await processOrder(ctx, order, totals);
      } catch (err) {
        totals.errors++;
        console.error(
          `${LOG_PREFIX} order ${order.id} failed: ${(err as Error)?.message}`,
        );
      }
    }
  }

  console.log(
    `${LOG_PREFIX} done — scanned=${totals.scanned} alreadySynced=${totals.alreadySynced} ` +
      `${apply ? `created=${totals.created}` : `wouldCreate=${totals.wouldCreate}`} ` +
      `skippedNoDelivery=${totals.skippedNoDelivery} skippedNoVideo=${totals.skippedNoVideo} ` +
      `errors=${totals.errors}`,
  );
  if (apply && totals.created > 0) {
    console.log(
      `${LOG_PREFIX} run \`npm run prisma:backfill:recompute-listing\` to fold the new public videos into go-live counts.`,
    );
  }
}

main()
  .catch((err) => {
    console.error(`${LOG_PREFIX} fatal:`, err);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
