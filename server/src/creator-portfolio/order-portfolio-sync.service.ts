import { Injectable, Logger } from '@nestjs/common';
import {
  PortfolioVideoAssetState,
  PortfolioVideoSource,
  PortfolioVisibilityStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { recomputeCreatorListingState } from '../creator-profile/creator-listing-state.util';

/** Shape of one entry in OrderDelivery.assets (stored loosely as JSON). */
interface DeliveryAsset {
  key?: unknown;
  kind?: unknown;
}

export type OrderPortfolioSyncStatus =
  | 'created'
  | 'exists'
  | 'skipped'
  | 'error';

export interface OrderPortfolioSyncResult {
  status: OrderPortfolioSyncStatus;
  videoId?: string;
  reason?: string;
}

/**
 * Publishes the approved final video of an accepted order into the creator's
 * portfolio as a "Brand Collab" tile.
 *
 * The tile holds an independent COPY of the video under the portfolio prefix
 * (see StorageService.copyOrderAssetToPortfolio), so the order and the portfolio
 * never share an S3 object: a creator can never be the reason an order loses its
 * final, and order-side cleanup can never blank a public profile tile.
 *
 * Copy-first: the object is copied, then the row is created as READY in one
 * step. An order copy is a fast same-bucket metadata operation, so — unlike the
 * Instagram mirror, which streams a large file over minutes and needs a
 * PROCESSING row + a reconcile worker — there is deliberately no intermediate
 * PROCESSING state here. That means an ORDER row is never left half-published
 * for a worker to recover, and nothing (the Instagram reconcile included, which
 * only scans source=INSTAGRAM rows) ever has to.
 *
 * Everything funnels through {@link syncAcceptedOrder}, which is idempotent — the
 * accept hook and the backfill both call it, and the (creatorId, sourceOrderId)
 * unique index guarantees exactly one tile per order. A rare crash between the
 * copy and the create leaves only an unreferenced object, which the
 * reclaim-orphan-portfolio-objects script sweeps and a backfill re-run replaces.
 */
@Injectable()
export class OrderPortfolioSyncService {
  private readonly logger = new Logger(OrderPortfolioSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Idempotent, never-throwing entry point. Returns a small result so the
   * backfill can summarise; the accept hook ignores it.
   */
  async syncAcceptedOrder(orderId: string): Promise<OrderPortfolioSyncResult> {
    try {
      return await this.run(orderId);
    } catch (err) {
      const reason = (err as Error)?.message ?? 'unknown';
      this.logger.error(
        `order->portfolio sync failed for order ${orderId}: ${reason}`,
      );
      return { status: 'error', reason };
    }
  }

  private async run(orderId: string): Promise<OrderPortfolioSyncResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, creatorId: true, acceptedAt: true },
    });
    if (!order) return { status: 'skipped', reason: 'order not found' };
    // acceptedAt is the single source of truth for "final accepted", set once in
    // acceptDelivery. An order can move on to CREATOR_PAYMENT_DONE afterwards, so
    // status is not checked here — acceptedAt stays set through the rest of the
    // lifecycle.
    if (!order.acceptedAt) {
      return { status: 'skipped', reason: 'order not accepted' };
    }

    // Idempotent fast path: a tile already exists for this order. Every tile is
    // created READY, so any existing row means the work is done.
    const existing = await this.findExistingTile(order.creatorId, order.id);
    if (existing) return { status: 'exists', videoId: existing };

    // Final accepted delivery = the highest revision number.
    const delivery = await this.prisma.orderDelivery.findFirst({
      where: { orderId: order.id },
      orderBy: { revisionNumber: 'desc' },
      select: { id: true, assets: true },
    });
    if (!delivery) return { status: 'skipped', reason: 'no delivery' };

    const sourceKey = this.pickVideoKey(delivery.assets);
    if (!sourceKey) return { status: 'skipped', reason: 'no video asset' };

    // Copy the object into the portfolio's own prefix, then create the row as
    // READY. The copy happens before any DB write, so a failure here leaves the
    // portfolio untouched rather than a half-published row.
    const portfolioKey = await this.storage.copyOrderAssetToPortfolio({
      sourceKey,
      creatorProfileId: order.creatorId,
    });

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.creatorPortfolioVideo.create({
          data: {
            creatorId: order.creatorId,
            source: PortfolioVideoSource.ORDER,
            sourceOrderId: order.id,
            sourceDeliveryId: delivery.id,
            // Brand Collab tiles are public by default; the creator can flip them
            // to private, but never delete them.
            visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
            assetState: PortfolioVideoAssetState.READY,
            videoKey: portfolioKey,
            videoUrl: this.storage.buildCdnUrl(portfolioKey),
          },
          select: { id: true },
        });
        await recomputeCreatorListingState(tx, order.creatorId);
        return row;
      });
      return { status: 'created', videoId: created.id };
    } catch (err) {
      // A racing accept/backfill created the tile between our existence check
      // and this create. The tile exists (success), and the object we just
      // copied is now unreferenced — best-effort delete it rather than leave an
      // orphan for the reclaim script.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        await this.storage
          .deleteObjectIfExists(portfolioKey)
          .catch(() => undefined);
        const existingAfterRace = await this.findExistingTile(
          order.creatorId,
          order.id,
        );
        if (existingAfterRace) {
          return { status: 'exists', videoId: existingAfterRace };
        }
      }
      throw err;
    }
  }

  private async findExistingTile(
    creatorId: string,
    orderId: string,
  ): Promise<string | null> {
    const row = await this.prisma.creatorPortfolioVideo.findUnique({
      where: {
        creatorId_sourceOrderId: { creatorId, sourceOrderId: orderId },
      },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /**
   * First playable video key in a delivery's assets, tolerating loose JSON.
   * Never returns a key for an asset explicitly marked a non-video (e.g. an
   * image): an image-only delivery yields null, so nothing is published.
   */
  private pickVideoKey(assets: Prisma.JsonValue | null): string | null {
    if (!Array.isArray(assets)) return null;
    const entries = assets as DeliveryAsset[];
    const keyOf = (a: DeliveryAsset): string | null =>
      typeof a?.key === 'string' && a.key.trim() ? a.key : null;

    // Prefer an asset explicitly marked as a video.
    for (const a of entries) {
      if (a?.kind === 'video') {
        const key = keyOf(a);
        if (key) return key;
      }
    }
    // Fall back only to assets whose kind is unknown (older rows lacked it);
    // an asset explicitly typed as something else — an image — is never used.
    for (const a of entries) {
      if (a?.kind == null) {
        const key = keyOf(a);
        if (key) return key;
      }
    }
    return null;
  }
}
