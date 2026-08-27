import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsGateway, portfolioRoom } from './payments.gateway';

/** The asset states worth telling a client about. */
export type PortfolioAssetState = 'READY' | 'FAILED';

/**
 * Pushes portfolio media transitions to whoever is looking at them.
 *
 * Two background jobs feed this, both with the same audience — the creator and
 * any admin watching that creator:
 *
 *  - the S3 mirror of an imported reel (`emitVideoAssetUpdated`)
 *  - a reel-cache sync batch (`emitReelSyncUpdated`)
 *
 * Both are "browser is waiting on a queue it cannot see", and both used to be
 * discovered by the browser asking on a timer.
 *
 * Shaped after OrderRealtimeNotifier.emitDeliveryWatermarkReady — the same
 * problem (a background media job completing) solved the same way.
 */
@Injectable()
export class PortfolioRealtimeNotifier {
  private readonly logger = new Logger(PortfolioRealtimeNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentsGateway,
  ) {}

  /**
   * Announce that one video's asset has settled.
   *
   * Two audiences: the creator, via the `user:` room every socket joins on
   * connect, and any admin who has subscribed to this creator's portfolio room
   * (an admin can import reels on a creator's behalf and watches the same rows).
   *
   * Never throws. A failed notification must not fail the mirror that succeeded
   * — the client still reconciles on its next reconnect or reload.
   */
  /**
   * Announce that a reel-cache sync batch has settled.
   *
   * Replaces a 2.5s poll of the status endpoint. That poll ran for as long as
   * the server reported "syncing" — and the queue deliberately holds a sync for
   * up to 15 minutes when Meta's usage headers trip the breaker, which is
   * exactly when a hundred creators are importing at once. 360 requests per
   * waiting tab, all of them saying "still working".
   *
   * Emitted for a failed and a no-op batch too, not just a successful one: the
   * picker shows a spinner from the moment it asks, and only an event takes it
   * down.
   */
  async emitReelSyncUpdated(params: {
    creatorProfileId: string;
    status: 'ready' | 'error';
    reelCount?: number;
    hasMore?: boolean;
    error?: string | null;
  }): Promise<void> {
    try {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { id: params.creatorProfileId },
        select: { userId: true },
      });
      const rooms = [
        portfolioRoom(params.creatorProfileId),
        ...(profile ? [`user:${profile.userId}`] : []),
      ];
      this.gateway.server.to(rooms).emit('instagram.reel_sync_updated', {
        creatorProfileId: params.creatorProfileId,
        status: params.status,
        reelCount: params.reelCount ?? null,
        hasMore: params.hasMore ?? null,
        error: params.error ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `emitReelSyncUpdated failed for ${params.creatorProfileId}: ${
          (err as Error)?.message
        }`,
      );
    }
  }

  async emitVideoAssetUpdated(params: {
    videoId: string;
    creatorProfileId: string;
    assetState: PortfolioAssetState;
  }): Promise<void> {
    try {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { id: params.creatorProfileId },
        select: { userId: true },
      });
      const rooms = [
        portfolioRoom(params.creatorProfileId),
        ...(profile ? [`user:${profile.userId}`] : []),
      ];
      this.gateway.server.to(rooms).emit('portfolio.video_asset_updated', {
        videoId: params.videoId,
        creatorProfileId: params.creatorProfileId,
        assetState: params.assetState,
      });
    } catch (err) {
      this.logger.warn(
        `emitVideoAssetUpdated failed for ${params.videoId}: ${
          (err as Error)?.message
        }`,
      );
    }
  }
}
