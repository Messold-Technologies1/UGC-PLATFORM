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
  let txCreate: jest.Mock;
  let service: OrderPortfolioSyncService;

  beforeEach(() => {
    jest.clearAllMocks();

    txCreate = jest.fn().mockResolvedValue({ id: 'new-row' });
    prismaMock = {
      order: { findUnique: jest.fn() },
      orderDelivery: { findFirst: jest.fn() },
      creatorPortfolioVideo: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ creatorPortfolioVideo: { create: txCreate } }),
      ),
    };
    storageMock = {
      copyOrderAssetToPortfolio: jest.fn().mockResolvedValue(portfolioKey),
      buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
      deleteObjectIfExists: jest.fn().mockResolvedValue(undefined),
    };

    service = new OrderPortfolioSyncService(prismaMock, storageMock);
  });

  const acceptedOrder = () => ({
    id: orderId,
    creatorId,
    acceptedAt: new Date(),
  });
  const deliveryWith = (rev: number, key: string) => ({
    id: `${deliveryId}-r${rev}`,
    assets: [{ key, kind: 'video' }],
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

  it('is idempotent when a tile already exists', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
      id: 'existing',
    });

    const res = await service.syncAcceptedOrder(orderId);

    expect(res).toEqual({ status: 'exists', videoId: 'existing' });
    expect(storageMock.copyOrderAssetToPortfolio).not.toHaveBeenCalled();
  });

  it('copies the single delivered video and publishes a READY tile', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue(null);
    prismaMock.orderDelivery.findFirst.mockResolvedValue(
      deliveryWith(0, sourceKey),
    );

    const res = await service.syncAcceptedOrder(orderId);

    expect(res).toEqual({ status: 'created', videoId: 'new-row' });
    expect(storageMock.copyOrderAssetToPortfolio).toHaveBeenCalledWith({
      sourceKey,
      creatorProfileId: creatorId,
    });
    // Copy happens before the row is created (copy-first, no PROCESSING state).
    expect(
      storageMock.copyOrderAssetToPortfolio.mock.invocationCallOrder[0],
    ).toBeLessThan(txCreate.mock.invocationCallOrder[0]);
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          creatorId,
          source: 'ORDER',
          sourceOrderId: orderId,
          sourceDeliveryId: 'delivery-2-r0',
          visibilityStatus: 'PUBLIC',
          assetState: 'READY',
          videoKey: portfolioKey,
        }),
      }),
    );
  });

  it('publishes the final revision, not an earlier one', async () => {
    const finalKey = `order-deliveries/${orderId}/r2/final.mp4`;
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue(null);
    // findFirst ordered by revisionNumber desc returns the last revision.
    prismaMock.orderDelivery.findFirst.mockResolvedValue(
      deliveryWith(2, finalKey),
    );

    await service.syncAcceptedOrder(orderId);

    expect(prismaMock.orderDelivery.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId },
        orderBy: { revisionNumber: 'desc' },
      }),
    );
    expect(storageMock.copyOrderAssetToPortfolio).toHaveBeenCalledWith({
      sourceKey: finalKey,
      creatorProfileId: creatorId,
    });
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sourceDeliveryId: 'delivery-2-r2' }),
      }),
    );
  });

  it('skips when the final delivery has no video asset', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue(null);
    prismaMock.orderDelivery.findFirst.mockResolvedValue({
      id: 'd',
      assets: [{ key: 'order-deliveries/x/r0/pic.jpg', kind: 'image' }],
    });

    const res = await service.syncAcceptedOrder(orderId);

    expect(res.status).toBe('skipped');
    expect(storageMock.copyOrderAssetToPortfolio).not.toHaveBeenCalled();
  });

  it('recovers from a create race and cleans up the orphan copy', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    // First existence check misses; after the P2002 the racing row is found.
    prismaMock.creatorPortfolioVideo.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'raced-row' });
    prismaMock.orderDelivery.findFirst.mockResolvedValue(
      deliveryWith(0, sourceKey),
    );
    txCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'x',
      }),
    );

    const res = await service.syncAcceptedOrder(orderId);

    expect(res).toEqual({ status: 'exists', videoId: 'raced-row' });
    // The copy we made before losing the race must not be left as an orphan.
    expect(storageMock.deleteObjectIfExists).toHaveBeenCalledWith(portfolioKey);
  });

  it('never throws — a copy failure is reported as an error result', async () => {
    prismaMock.order.findUnique.mockResolvedValue(acceptedOrder());
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue(null);
    prismaMock.orderDelivery.findFirst.mockResolvedValue(
      deliveryWith(0, sourceKey),
    );
    storageMock.copyOrderAssetToPortfolio.mockRejectedValue(
      new Error('S3 down'),
    );

    const res = await service.syncAcceptedOrder(orderId);

    expect(res.status).toBe('error');
    // Copy failed before any DB write, so nothing was created.
    expect(txCreate).not.toHaveBeenCalled();
  });
});
