import { Injectable, Logger } from '@nestjs/common';
import {
  PortfolioVideoAssetState,
  PortfolioVideoSource,
  PortfolioVisibilityStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PortfolioRealtimeNotifier } from '../realtime/portfolio-realtime.notifier';
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
 * Everything funnels through {@link syncAcceptedOrder}, which is idempotent — the
 * accept hook, the stuck-row reconcile, and the backfill all call it, and the
 * (creatorId, sourceOrderId) unique index guarantees exactly one tile per order.
 */
@Injectable()
export class OrderPortfolioSyncService {
  private readonly logger = new Logger(OrderPortfolioSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly notifier: PortfolioRealtimeNotifier,
  ) {}

  /**
   * Idempotent, never-throwing entry point. Returns a small result so the
   * backfill can summarise; individual callers (the accept hook) ignore it.
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

    // Fast idempotent path: a finished tile already exists for this order.
    const existing = await this.prisma.creatorPortfolioVideo.findUnique({
      where: {
        creatorId_sourceOrderId: {
          creatorId: order.creatorId,
          sourceOrderId: order.id,
        },
      },
      select: { id: true, assetState: true, videoKey: true },
    });
    if (
      existing &&
      existing.assetState === PortfolioVideoAssetState.READY &&
      existing.videoKey
    ) {
      return { status: 'exists', videoId: existing.id };
    }

    // Final accepted delivery = the highest revision number.
    const delivery = await this.prisma.orderDelivery.findFirst({
      where: { orderId: order.id },
      orderBy: { revisionNumber: 'desc' },
      select: { id: true, assets: true },
    });
    if (!delivery) return { status: 'skipped', reason: 'no delivery' };

    const sourceKey = this.pickVideoKey(delivery.assets);
    if (!sourceKey) return { status: 'skipped', reason: 'no video asset' };

    // 1) Anchor the idempotency: ensure a PROCESSING row exists before the copy,
    // so a crash between copy and DB write is recoverable and a concurrent call
    // cannot create a second tile.
    const rowId =
      existing?.id ??
      (await this.ensureProcessingRow(order.creatorId, order.id, delivery.id));

    // 2) Same-bucket copy into the portfolio's own prefix.
    const portfolioKey = await this.storage.copyOrderAssetToPortfolio({
      sourceKey,
      creatorProfileId: order.creatorId,
    });

    // 3) Flip to READY and recompute the go-live count in one transaction.
    await this.prisma.$transaction(async (tx) => {
      await tx.creatorPortfolioVideo.update({
        where: { id: rowId },
        data: {
          videoKey: portfolioKey,
          videoUrl: this.storage.buildCdnUrl(portfolioKey),
          assetState: PortfolioVideoAssetState.READY,
          sourceDeliveryId: delivery.id,
        },
      });
      await recomputeCreatorListingState(tx, order.creatorId);
    });

    // Push the settled state to anyone watching the grid. Never fatal.
    await this.notifier
      .emitVideoAssetUpdated({
        videoId: rowId,
        creatorProfileId: order.creatorId,
        assetState: 'READY',
      })
      .catch(() => undefined);

    return { status: 'created', videoId: rowId };
  }

  /**
   * Create the collab row as PROCESSING, or reuse the one a racing call just
   * created. The unique index is what makes the race safe: the loser catches
   * P2002 and re-reads the winner's row.
   */
  private async ensureProcessingRow(
    creatorId: string,
    orderId: string,
    deliveryId: string,
  ): Promise<string> {
    try {
      const created = await this.prisma.creatorPortfolioVideo.create({
        data: {
          creatorId,
          source: PortfolioVideoSource.ORDER,
          sourceOrderId: orderId,
          sourceDeliveryId: deliveryId,
          // Brand Collab tiles are public by default; the creator can flip them
          // to private, but never delete them.
          visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
          assetState: PortfolioVideoAssetState.PROCESSING,
        },
        select: { id: true },
      });
      return created.id;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const row = await this.prisma.creatorPortfolioVideo.findUnique({
          where: {
            creatorId_sourceOrderId: { creatorId, sourceOrderId: orderId },
          },
          select: { id: true },
        });
        if (row) return row.id;
      }
      throw err;
    }
  }

  /** First playable video key in a delivery's assets, tolerating loose JSON. */
  private pickVideoKey(assets: Prisma.JsonValue | null): string | null {
    if (!Array.isArray(assets)) return null;
    const entries = assets as DeliveryAsset[];
    const isKey = (a: DeliveryAsset): string | null =>
      typeof a?.key === 'string' && a.key.trim() ? a.key : null;

    // Prefer an asset explicitly marked as a video.
    for (const a of entries) {
      if (a?.kind === 'video') {
        const key = isKey(a);
        if (key) return key;
      }
    }
    // Fall back to the first asset with a key (older rows may lack `kind`).
    for (const a of entries) {
      const key = isKey(a);
      if (key) return key;
    }
    return null;
  }
}
