import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';

/**
 * Delivery uploads for large files go through S3 multipart, which splits one
 * authorized call into many: create, then a sign-part per 10 MiB, then
 * complete. The per-part calls are the interesting ones — they take an object
 * key from the browser, so the test that matters is that a creator cannot hand
 * in somebody else's key and get a signed URL for it.
 */
describe('OrdersService — delivery multipart uploads', () => {
  const UPLOADABLE_ORDER = {
    id: 'order-1',
    creatorId: 'creator-1',
    status: 'BRIEF_ACCEPTED',
    acceptedAt: null,
    revisionCount: 0,
    maxRevisionsSnapshot: 2,
    requiresPhysicalProductShipment: false,
  };

  function makeService(order: Record<string, unknown> = UPLOADABLE_ORDER) {
    const prisma = {
      creatorProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'creator-1' }),
      },
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      orderDelivery: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const storage = {
      buildObjectKey: jest
        .fn()
        .mockReturnValue('order-deliveries/order-1/r0/asset.mp4'),
      createMultipartUpload: jest.fn().mockResolvedValue({
        key: 'order-deliveries/order-1/r0/asset.mp4',
        uploadId: 'upload-1',
        cdnUrl: 'https://cdn.example.com/order-deliveries/order-1/r0/asset.mp4',
        partSizeBytes: 10 * 1024 * 1024,
        expiresInSeconds: 900,
      }),
      signUploadPart: jest.fn().mockResolvedValue('https://s3.example/part'),
      completeMultipartUpload: jest
        .fn()
        .mockResolvedValue('order-deliveries/order-1/r0/asset.mp4'),
      abortMultipartUpload: jest.fn().mockResolvedValue(undefined),
      buildCdnUrl: jest.fn().mockReturnValue('https://cdn.example.com/asset'),
    };

    const service = new OrdersService(
      prisma as never,
      {} as never, // razorpay
      {} as never, // orderRealtime
      storage as never,
      {} as never, // brandAccess
      {} as never, // watermarkQueue
      {} as never, // orderPortfolioSync
      {} as never, // coupons
      {} as never, // wallet
      {} as never, // notification events
      { get: () => undefined } as never, // config
    );
    return { service, prisma, storage };
  }

  it('creates the upload under the order/revision prefix', async () => {
    const { service, storage } = makeService();

    const result = await service.createDeliveryMultipartUpload({
      orderId: 'order-1',
      creatorUserId: 'user-1',
      dto: {
        contentType: 'video/mp4',
        contentLength: 367_001_600,
        kind: 'video',
      },
    });

    expect(storage.buildObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'order_delivery_asset',
        orderId: 'order-1',
        revisionNumber: 0,
      }),
    );
    expect(result.uploadId).toBe('upload-1');
    expect(result.partSizeBytes).toBe(10 * 1024 * 1024);
  });

  it('files a revision upload under that revision, not r0', async () => {
    const { service, storage } = makeService({
      ...UPLOADABLE_ORDER,
      status: 'REVISION_REQUESTED',
      revisionCount: 2,
    });

    await service.createDeliveryMultipartUpload({
      orderId: 'order-1',
      creatorUserId: 'user-1',
      dto: { contentType: 'video/mp4', contentLength: 1_000, kind: 'video' },
    });

    expect(storage.buildObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({ revisionNumber: 2 }),
    );
  });

  it('refuses to create an upload on an order the caller does not own', async () => {
    const { service, storage } = makeService({
      ...UPLOADABLE_ORDER,
      creatorId: 'someone-else',
    });

    await expect(
      service.createDeliveryMultipartUpload({
        orderId: 'order-1',
        creatorUserId: 'user-1',
        dto: { contentType: 'video/mp4', contentLength: 1_000, kind: 'video' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });

  it('signs a part for a key belonging to this order', async () => {
    const { service, storage } = makeService();

    const result = await service.signDeliveryMultipartPart({
      orderId: 'order-1',
      creatorUserId: 'user-1',
      dto: {
        key: 'order-deliveries/order-1/r0/asset.mp4',
        uploadId: 'upload-1',
        partNumber: 3,
      },
    });

    expect(result.url).toBe('https://s3.example/part');
    expect(storage.signUploadPart).toHaveBeenCalledWith({
      key: 'order-deliveries/order-1/r0/asset.mp4',
      uploadId: 'upload-1',
      partNumber: 3,
    });
  });

  it("refuses to sign a part for another order's key", async () => {
    const { service, storage } = makeService();

    await expect(
      service.signDeliveryMultipartPart({
        orderId: 'order-1',
        creatorUserId: 'user-1',
        dto: {
          key: 'order-deliveries/order-99/r0/victim.mp4',
          uploadId: 'upload-1',
          partNumber: 1,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.signUploadPart).not.toHaveBeenCalled();
  });

  it('refuses a key that only looks like this order, by prefix', async () => {
    const { service, storage } = makeService();

    await expect(
      service.signDeliveryMultipartPart({
        orderId: 'order-1',
        creatorUserId: 'user-1',
        // "order-1" is a prefix of "order-10": the trailing slash is what stops
        // this being signed.
        dto: {
          key: 'order-deliveries/order-10/r0/victim.mp4',
          uploadId: 'upload-1',
          partNumber: 1,
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.signUploadPart).not.toHaveBeenCalled();
  });

  it("refuses to complete another order's upload", async () => {
    const { service, storage } = makeService();

    await expect(
      service.completeDeliveryMultipartUpload({
        orderId: 'order-1',
        creatorUserId: 'user-1',
        dto: {
          key: 'order-deliveries/order-99/r0/victim.mp4',
          uploadId: 'upload-1',
          parts: [{ partNumber: 1, etag: '"abc"' }],
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.completeMultipartUpload).not.toHaveBeenCalled();
  });

  it("refuses to abort another order's upload", async () => {
    const { service, storage } = makeService();

    await expect(
      service.abortDeliveryMultipartUpload({
        orderId: 'order-1',
        creatorUserId: 'user-1',
        dto: {
          key: 'order-deliveries/order-99/r0/victim.mp4',
          uploadId: 'upload-1',
        },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.abortMultipartUpload).not.toHaveBeenCalled();
  });

  it('completes an owned upload and returns its CDN url', async () => {
    const { service, storage } = makeService();

    const result = await service.completeDeliveryMultipartUpload({
      orderId: 'order-1',
      creatorUserId: 'user-1',
      dto: {
        key: 'order-deliveries/order-1/r0/asset.mp4',
        uploadId: 'upload-1',
        parts: [{ partNumber: 1, etag: '"abc"' }],
      },
    });

    expect(storage.completeMultipartUpload).toHaveBeenCalled();
    expect(result).toEqual({
      key: 'order-deliveries/order-1/r0/asset.mp4',
      cdnUrl: 'https://cdn.example.com/asset',
    });
  });

  it('refuses to start an upload while a submitted delivery is still processing', async () => {
    const { service, prisma, storage } = makeService();
    prisma.orderDelivery.findUnique.mockResolvedValue({
      previewStatus: 'processing',
    });

    await expect(
      service.createDeliveryMultipartUpload({
        orderId: 'order-1',
        creatorUserId: 'user-1',
        dto: { contentType: 'video/mp4', contentLength: 1_000, kind: 'video' },
      }),
    ).rejects.toThrow(/already submitted/i);
    expect(storage.createMultipartUpload).not.toHaveBeenCalled();
  });
});
