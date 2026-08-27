import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsGateway, portfolioRoom } from './payments.gateway';

/** The asset states worth telling a client about. */
export type PortfolioAssetState = 'READY' | 'FAILED';

/**
 * Pushes portfolio asset transitions to whoever is looking at them.
 *
 * An Instagram import is saved before its file is copied into our storage, so
 * the row sits in PROCESSING for a while. This is what tells the browser it has
 * finished, instead of the browser asking on a timer.
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
