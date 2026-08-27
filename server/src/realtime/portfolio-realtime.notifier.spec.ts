import { PortfolioRealtimeNotifier } from './portfolio-realtime.notifier';
import { portfolioRoom } from './payments.gateway';

describe('PortfolioRealtimeNotifier', () => {
  const creatorProfileId = 'profile-1';
  const creatorUserId = 'user-1';
  const videoId = 'video-1';

  let emit: jest.Mock;
  let to: jest.Mock;
  let prisma: { creatorProfile: { findUnique: jest.Mock } };
  let notifier: PortfolioRealtimeNotifier;

  beforeEach(() => {
    emit = jest.fn();
    to = jest.fn(() => ({ emit }));
    prisma = { creatorProfile: { findUnique: jest.fn() } };
    prisma.creatorProfile.findUnique.mockResolvedValue({
      userId: creatorUserId,
    });
    notifier = new PortfolioRealtimeNotifier(
      prisma as never,
      {
        server: { to },
      } as never,
    );
  });

  it('reaches the creator and any admin watching their portfolio', async () => {
    await notifier.emitVideoAssetUpdated({
      videoId,
      creatorProfileId,
      assetState: 'READY',
    });

    expect(to).toHaveBeenCalledWith([
      portfolioRoom(creatorProfileId),
      `user:${creatorUserId}`,
    ]);
    expect(emit).toHaveBeenCalledWith('portfolio.video_asset_updated', {
      videoId,
      creatorProfileId,
      assetState: 'READY',
    });
  });

  it('still reaches the admin room when the creator profile has vanished', async () => {
    prisma.creatorProfile.findUnique.mockResolvedValue(null);

    await notifier.emitVideoAssetUpdated({
      videoId,
      creatorProfileId,
      assetState: 'FAILED',
    });

    expect(to).toHaveBeenCalledWith([portfolioRoom(creatorProfileId)]);
    expect(emit).toHaveBeenCalled();
  });

  it('announces a reel sync to the same two audiences', async () => {
    await notifier.emitReelSyncUpdated({
      creatorProfileId,
      status: 'ready',
      reelCount: 100,
      hasMore: true,
    });

    expect(to).toHaveBeenCalledWith([
      portfolioRoom(creatorProfileId),
      `user:${creatorUserId}`,
    ]);
    expect(emit).toHaveBeenCalledWith('instagram.reel_sync_updated', {
      creatorProfileId,
      status: 'ready',
      reelCount: 100,
      hasMore: true,
      error: null,
    });
  });

  it('normalises the optional reel sync fields to null', async () => {
    // The client distinguishes "not reported" from a real zero, so undefined
    // must not reach the wire as a missing key.
    await notifier.emitReelSyncUpdated({
      creatorProfileId,
      status: 'error',
      error: 'Graph down',
    });

    expect(emit).toHaveBeenCalledWith('instagram.reel_sync_updated', {
      creatorProfileId,
      status: 'error',
      reelCount: null,
      hasMore: null,
      error: 'Graph down',
    });
  });

  it('swallows a reel sync notification failure rather than failing the sync', async () => {
    prisma.creatorProfile.findUnique.mockRejectedValue(new Error('db down'));

    await expect(
      notifier.emitReelSyncUpdated({ creatorProfileId, status: 'ready' }),
    ).resolves.toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });

  it('swallows a notification failure rather than failing the mirror', async () => {
    // The upload already succeeded by the time this runs. Throwing here would
    // turn a mirrored video into a retried job that re-uploads the same bytes.
    prisma.creatorProfile.findUnique.mockRejectedValue(new Error('db down'));

    await expect(
      notifier.emitVideoAssetUpdated({
        videoId,
        creatorProfileId,
        assetState: 'READY',
      }),
    ).resolves.toBeUndefined();
    expect(emit).not.toHaveBeenCalled();
  });
});
