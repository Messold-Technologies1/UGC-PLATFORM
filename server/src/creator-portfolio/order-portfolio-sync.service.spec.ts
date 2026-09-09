import { Prisma } from '@prisma/client';
import { OrderPortfolioSyncService } from './order-portfolio-sync.service';

// The listing-state recompute is exercised by its own suite; here we only need
// it to be a no-op inside the transaction.
jest.mock('../creator-profile/creator-listing-state.util', () => ({
  recomputeCreatorListingState: jest.fn().mockResolvedValue(undefined),
}));

describe('OrderPortfolioSyncService', () => {
  const orderId = 'order-1';
  const creatorId = 'creator-1';
  const deliveryId = 'delivery-2';
  const sourceKey = `order-deliveries/${orderId}/r1/abc.mp4`;
  const portfolioKey = `creator-portfolio/${creatorId}/videos/new.mp4`;

  let prismaMock: any;
  let storageMock: any;
  let notifierMock: any;
  let service: OrderPortfolioSyncService;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = {
      order: { findUnique: jest.fn() },
      orderDelivery: { findFirst: jest.fn() },
      creatorPortfolioVideo: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ creatorPortfolioVideo: { update: jest.fn() } }),
      ),
    };
    storageMock = {
      copyOrderAssetToPortfolio: jest.fn().mockResolvedValue(portfolioKey),
      buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
    };
    notifierMock = {
      emitVideoAssetUpdated: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrderPortfolioSyncService(
      prismaMock,
      storageMock,
      notifierMock,
    );
  });

  const acceptedOrder = () => ({
    id: orderId,
    creatorId,
    acceptedAt: new Date(),
  });
  const finalDelivery = () => ({
    id: deliveryId,
    assets: [{ key: sourceKey, kind: 'video' }],
  });

  it('skips an order that is not accepted', async () => {
    prismaMock.order.findUnique.mockResolvedValue({
      id: orderId,
      creatorId,
      acceptedAt: null,
    });

    const res = await service.syncAcceptedOrder(orderId);

    expect(res.status).toBe('skipped');
    expect(storageMock.copyOrderAssetToPortfolio).not.toHaveBeenCalled();
  });

  it('is idempotent when a READY collab tile already exists', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
      id: 'existing',
      assetState: 'READY',
      videoKey: portfolioKey,
    });

    const res = await service.syncAcceptedOrder(orderId);

    expect(res).toEqual({ status: 'exists', videoId: 'existing' });
    expect(storageMock.copyOrderAssetToPortfolio).not.toHaveBeenCalled();
  });

  it('copies the final delivery video and publishes a READY tile', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue(null);
    prismaMock.orderDelivery.findFirst.mockResolvedValue(finalDelivery());
    prismaMock.creatorPortfolioVideo.create.mockResolvedValue({
      id: 'new-row',
    });

    const res = await service.syncAcceptedOrder(orderId);

    expect(res).toEqual({ status: 'created', videoId: 'new-row' });
    // Final delivery = the one findFirst returns (ordered by revisionNumber desc).
    expect(prismaMock.orderDelivery.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { revisionNumber: 'desc' } }),
    );
    // The row is anchored as ORDER/PUBLIC/PROCESSING before the copy.
    expect(prismaMock.creatorPortfolioVideo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creatorId,
          source: 'ORDER',
          sourceOrderId: orderId,
          sourceDeliveryId: deliveryId,
          visibilityStatus: 'PUBLIC',
          assetState: 'PROCESSING',
        }),
      }),
    );
    expect(storageMock.copyOrderAssetToPortfolio).toHaveBeenCalledWith({
      sourceKey,
      creatorProfileId: creatorId,
    });
    expect(notifierMock.emitVideoAssetUpdated).toHaveBeenCalledWith({
      videoId: 'new-row',
      creatorProfileId: creatorId,
      assetState: 'READY',
    });
  });

  it('recovers from a create race via the unique index', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    // First existence check misses; the racing accept hook created the row.
    prismaMock.creatorPortfolioVideo.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'raced-row' });
    prismaMock.orderDelivery.findFirst.mockResolvedValue(finalDelivery());
    prismaMock.creatorPortfolioVideo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );

    const res = await service.syncAcceptedOrder(orderId);

    expect(res).toEqual({ status: 'created', videoId: 'raced-row' });
    expect(storageMock.copyOrderAssetToPortfolio).toHaveBeenCalled();
  });

  it('never throws — a copy failure is reported as an error result', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue(null);
    prismaMock.orderDelivery.findFirst.mockResolvedValue(finalDelivery());
    prismaMock.creatorPortfolioVideo.create.mockResolvedValue({
      id: 'new-row',
    });
    storageMock.copyOrderAssetToPortfolio.mockRejectedValue(
      new Error('S3 down'),
    );

    const res = await service.syncAcceptedOrder(orderId);

    expect(res.status).toBe('error');
  });
});
