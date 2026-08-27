import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';

/** Only PORTFOLIO_IG_IMPORT_MODE is read by the service under test. */
const configMock = {
  get: jest.fn((_key: string, fallback?: unknown) => fallback),
};
import { CreatorPortfolioService } from './creator-portfolio.service';

describe('CreatorPortfolioService admin portfolio access', () => {
  const adminUserId = 'admin-user';
  const creatorUserId = 'creator-user';
  const creatorProfileId = 'profile-1';

  const prismaMock = {
    user: { findUnique: jest.fn() },
    creatorProfile: { findUnique: jest.fn() },
    creatorPortfolioVideo: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        creatorPortfolioVideo: { update: jest.fn() },
      }),
    ),
  };

  const storageMock = {
    buildObjectKey: jest.fn(),
    createPresignedPutUpload: jest.fn(),
    buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
  };

  let service: CreatorPortfolioService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreatorPortfolioService(
      prismaMock as never,
      storageMock as never,
      configMock as never,
    );
  });

  it('allows admin to presign upload for a creator profile', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    storageMock.buildObjectKey.mockReturnValueOnce(
      `creator-portfolio/${creatorProfileId}/videos/uuid.mp4`,
    );
    storageMock.createPresignedPutUpload.mockResolvedValueOnce({
      key: `creator-portfolio/${creatorProfileId}/videos/uuid.mp4`,
      uploadUrl: 'https://s3.example/upload',
      headers: {},
      expiresInSeconds: 900,
      cdnUrl: 'https://cdn.example/video.mp4',
    });

    await service.presignUpload(
      adminUserId,
      { kind: 'video', contentType: 'video/mp4', contentLength: 1000 },
      creatorProfileId,
    );

    expect(storageMock.buildObjectKey).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorProfileId,
        userId: creatorUserId,
      }),
    );
  });

  it('rejects non-admin presign for another creator profile', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.BRAND },
      userRoles: [],
    });

    await expect(
      service.presignUpload(
        'brand-user',
        { kind: 'video', contentType: 'video/mp4', contentLength: 1000 },
        creatorProfileId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows admin to update a video on the target creator profile', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValueOnce({
      id: 'video-1',
      creatorId: creatorProfileId,
    });

    const txUpdate = jest.fn().mockResolvedValueOnce({
      id: 'video-1',
      creatorId: creatorProfileId,
      videoUrl: 'https://cdn.example/v.mp4',
      thumbnailUrl: null,
      visibilityStatus: 'PUBLIC',
      tags: [],
      createdAt: new Date(),
    });
    prismaMock.$transaction.mockImplementationOnce(
      (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          creatorPortfolioVideo: {
            update: txUpdate,
            count: jest.fn().mockResolvedValue(3),
          },
          creatorProfile: {
            findUnique: jest.fn().mockResolvedValue({
              profileImageUrl: 'https://cdn.example/p.jpg',
              introVideoUrl: 'https://cdn.example/i.mp4',
              displayName: 'Test',
              contactEmail: 't@example.com',
              bio: 'bio',
              countryName: 'India',
              stateName: 'MH',
              city: 'Mumbai',
              gender: 'FEMALE',
              dateOfBirth: new Date('1995-01-01'),
              shippingAddress: 'addr',
              completeProfile: true,
              isListed: true,
              creatorApproval: { status: 'APPROVED' },
              facetSelections: [],
              _count: { profileLanguages: 1, packages: 1 },
            }),
            update: jest.fn(),
          },
        }),
    );

    const result = await service.updateVideo(
      adminUserId,
      'video-1',
      { videoKey: `creator-portfolio/${creatorProfileId}/videos/new.mp4` },
      creatorProfileId,
    );

    expect(result.id).toBe('video-1');
    expect(txUpdate).toHaveBeenCalled();
  });

  it('rejects admin update when video belongs to another creator', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValueOnce({
      id: 'video-1',
      creatorId: 'other-profile',
    });

    await expect(
      service.updateVideo(
        adminUserId,
        'video-1',
        { videoKey: `creator-portfolio/${creatorProfileId}/videos/new.mp4` },
        creatorProfileId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists all portfolio videos for admin including private', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
    prismaMock.creatorPortfolioVideo.findMany.mockResolvedValueOnce([
      {
        id: 'video-1',
        creatorId: creatorProfileId,
        videoUrl: 'https://cdn.example/v1.mp4',
        thumbnailUrl: null,
        visibilityStatus: 'PUBLIC',
        tags: [],
        createdAt: new Date(),
      },
      {
        id: 'video-2',
        creatorId: creatorProfileId,
        videoUrl: 'https://cdn.example/v2.mp4',
        thumbnailUrl: null,
        visibilityStatus: 'PRIVATE',
        tags: [],
        createdAt: new Date(),
      },
    ]);

    const result = await service.listAllVideosForAdmin(adminUserId);

    expect(result).toHaveLength(2);
    expect(result.map((v) => v.visibilityStatus).sort()).toEqual([
      'private',
      'public',
    ]);
  });

  it('rejects non-admin list all portfolio videos', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.BRAND },
      userRoles: [],
    });

    await expect(
      service.listAllVideosForAdmin('brand-user'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks deleting a video when only the minimum remain', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValueOnce({
      id: 'video-1',
      creatorId: creatorProfileId,
    });
    prismaMock.creatorPortfolioVideo.count.mockResolvedValueOnce(3);

    await expect(
      service.deleteVideo(creatorUserId, 'video-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.creatorPortfolioVideo.delete).not.toHaveBeenCalled();
  });

  it('allows deleting a video when more than the minimum remain', async () => {
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValueOnce({
      id: 'video-1',
      creatorId: creatorProfileId,
    });
    prismaMock.creatorPortfolioVideo.count.mockResolvedValueOnce(4);
    prismaMock.creatorPortfolioVideo.delete.mockResolvedValueOnce({});

    await service.deleteVideo(creatorUserId, 'video-1');

    expect(prismaMock.creatorPortfolioVideo.delete).toHaveBeenCalledWith({
      where: { id: 'video-1' },
    });
  });

  it('throws when admin targets unknown creator profile', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
    prismaMock.creatorProfile.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.presignUpload(
        adminUserId,
        { kind: 'video', contentType: 'video/mp4', contentLength: 1000 },
        'missing-profile',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CreatorPortfolioService video lifecycle', () => {
  const creatorUserId = 'creator-user';
  const creatorProfileId = 'profile-1';
  const videoId = 'video-1';
  const oldVideoKey = `creator-portfolio/${creatorProfileId}/videos/old.mp4`;
  const oldThumbKey = `creator-portfolio/${creatorProfileId}/thumbnails/old.jpg`;
  const newVideoKey = `creator-portfolio/${creatorProfileId}/videos/new.mp4`;
  const newThumbKey = `creator-portfolio/${creatorProfileId}/thumbnails/new.jpg`;

  /** Captures what the transaction wrote so ordering can be asserted. */
  let txUpdate: jest.Mock;
  /** Records the call order of the row write vs. the S3 deletes. */
  let order: string[];

  const prismaMock = {
    user: { findUnique: jest.fn() },
    creatorProfile: { findUnique: jest.fn() },
    creatorPortfolioVideo: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    instagramMediaItem: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const storageMock = {
    buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
    deleteObjectIfExists: jest.fn(),
    buildObjectKey: jest.fn(() => newVideoKey),
    createPresignedPutUpload: jest.fn(async () => ({
      key: newVideoKey,
      uploadUrl: 'https://s3.example/upload',
      headers: {},
      expiresInSeconds: 900,
      cdnUrl: `https://cdn.example/${newVideoKey}`,
    })),
  };

  let service: CreatorPortfolioService;

  beforeEach(() => {
    jest.clearAllMocks();
    order = [];

    txUpdate = jest.fn(async (args: { data: Record<string, unknown> }) => {
      order.push('row-write');
      return {
        id: videoId,
        creatorId: creatorProfileId,
        videoUrl: 'https://cdn.example/whatever.mp4',
        thumbnailUrl: null,
        tags: [],
        visibilityStatus: 'PUBLIC',
        createdAt: new Date(0),
        ...args.data,
      };
    });

    prismaMock.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          creatorPortfolioVideo: { update: txUpdate },
          creatorProfile: { findUnique: jest.fn().mockResolvedValue(null) },
        }),
    );

    storageMock.deleteObjectIfExists.mockImplementation(async (k: string) => {
      order.push(`s3-delete:${k}`);
    });

    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: creatorProfileId,
      userId: creatorUserId,
    });

    service = new CreatorPortfolioService(
      prismaMock as never,
      storageMock as never,
      configMock as never,
    );
  });

  describe('deleteVideo', () => {
    beforeEach(() => {
      prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
        id: videoId,
        creatorId: creatorProfileId,
        videoKey: oldVideoKey,
        thumbnailKey: oldThumbKey,
      });
      prismaMock.creatorPortfolioVideo.count.mockResolvedValue(4);
      prismaMock.creatorPortfolioVideo.delete.mockResolvedValue({});
    });

    it('removes the video and thumbnail objects from storage', async () => {
      await service.deleteVideo(creatorUserId, videoId);

      expect(storageMock.deleteObjectIfExists).toHaveBeenCalledWith(
        oldVideoKey,
      );
      expect(storageMock.deleteObjectIfExists).toHaveBeenCalledWith(
        oldThumbKey,
      );
    });

    it('still succeeds when storage deletion fails', async () => {
      storageMock.deleteObjectIfExists.mockRejectedValue(new Error('S3 down'));

      await expect(
        service.deleteVideo(creatorUserId, videoId),
      ).resolves.toBeUndefined();
      expect(prismaMock.creatorPortfolioVideo.delete).toHaveBeenCalled();
    });

    it('does not touch storage when the floor refuses the delete', async () => {
      prismaMock.creatorPortfolioVideo.count.mockResolvedValue(3);

      await expect(
        service.deleteVideo(creatorUserId, videoId),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prismaMock.creatorPortfolioVideo.delete).not.toHaveBeenCalled();
      expect(storageMock.deleteObjectIfExists).not.toHaveBeenCalled();
    });
  });

  describe('updateVideo replace', () => {
    beforeEach(() => {
      prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
        id: videoId,
        creatorId: creatorProfileId,
        videoKey: oldVideoKey,
        thumbnailKey: oldThumbKey,
        igMediaId: null,
      });
      prismaMock.instagramMediaItem.updateMany.mockResolvedValue({ count: 0 });
    });

    it('swaps in the new key and derives its CDN url', async () => {
      await service.updateVideo(creatorUserId, videoId, {
        videoKey: newVideoKey,
        thumbnailKey: newThumbKey,
      });

      expect(txUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            videoKey: newVideoKey,
            videoUrl: `https://cdn.example/${newVideoKey}`,
            thumbnailKey: newThumbKey,
            thumbnailUrl: `https://cdn.example/${newThumbKey}`,
          }),
        }),
      );
    });

    it('deletes the superseded objects only after the row is written', async () => {
      await service.updateVideo(creatorUserId, videoId, {
        videoKey: newVideoKey,
        thumbnailKey: newThumbKey,
      });

      expect(order).toEqual([
        'row-write',
        `s3-delete:${oldVideoKey}`,
        `s3-delete:${oldThumbKey}`,
      ]);
    });

    it('clears a thumbnail the replacement did not supply', async () => {
      await service.updateVideo(creatorUserId, videoId, {
        videoKey: newVideoKey,
      });

      expect(txUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnailKey: null,
            thumbnailUrl: null,
          }),
        }),
      );
      expect(storageMock.deleteObjectIfExists).toHaveBeenCalledWith(
        oldThumbKey,
      );
    });

    it('rejects a replacement key under another creator prefix', async () => {
      await expect(
        service.updateVideo(creatorUserId, videoId, {
          videoKey: 'creator-portfolio/someone-else/videos/new.mp4',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(txUpdate).not.toHaveBeenCalled();
      expect(storageMock.deleteObjectIfExists).not.toHaveBeenCalled();
    });

    it('leaves storage alone on a metadata-only update', async () => {
      await service.updateVideo(creatorUserId, videoId, {
        thumbnailKey: oldThumbKey,
      });

      expect(storageMock.deleteObjectIfExists).not.toHaveBeenCalled();
    });

    it('keeps the object when the same key is resent', async () => {
      await service.updateVideo(creatorUserId, videoId, {
        videoKey: oldVideoKey,
        thumbnailKey: oldThumbKey,
      });

      expect(storageMock.deleteObjectIfExists).not.toHaveBeenCalled();
    });

    describe('replacing an imported reel', () => {
      beforeEach(() => {
        prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
          id: videoId,
          creatorId: creatorProfileId,
          videoKey: oldVideoKey,
          thumbnailKey: oldThumbKey,
          igMediaId: '17912345678901234',
        });
      });

      it('drops the Instagram provenance the row no longer holds', async () => {
        await service.updateVideo(creatorUserId, videoId, {
          videoKey: newVideoKey,
        });

        expect(txUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              source: 'UPLOAD',
              assetState: 'READY',
              igMediaId: null,
              igPermalink: null,
              igPostedAt: null,
              importedAt: null,
            }),
          }),
        );
      });

      it('un-dims the reel in the picker', async () => {
        await service.updateVideo(creatorUserId, videoId, {
          videoKey: newVideoKey,
        });

        expect(prismaMock.instagramMediaItem.updateMany).toHaveBeenCalledWith({
          where: { importedVideoId: videoId },
          data: { importedVideoId: null },
        });
      });

      it('still completes the replace when un-dimming fails', async () => {
        prismaMock.instagramMediaItem.updateMany.mockRejectedValue(
          new Error('db blip'),
        );

        await expect(
          service.updateVideo(creatorUserId, videoId, {
            videoKey: newVideoKey,
          }),
        ).resolves.toBeDefined();
        expect(txUpdate).toHaveBeenCalled();
      });

      it('leaves provenance intact on a thumbnail-only update', async () => {
        // No new video key means the row still holds the reel it was imported
        // from, so nothing about its origin has changed.
        await service.updateVideo(creatorUserId, videoId, {
          thumbnailKey: newThumbKey,
        });

        expect(txUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.not.objectContaining({ igMediaId: null }),
          }),
        );
        expect(prismaMock.instagramMediaItem.updateMany).not.toHaveBeenCalled();
      });
    });
  });
});

describe('CreatorPortfolioService duplicate-upload guard', () => {
  const creatorUserId = 'creator-user';
  const creatorProfileId = 'profile-1';
  const videoKey = `creator-portfolio/${creatorProfileId}/videos/new.mp4`;
  const hash = 'a'.repeat(64);

  const prismaMock = {
    user: { findUnique: jest.fn() },
    // createVideo now always writes PUBLIC, so every create runs the
    // listing-state recompute — which reads and may write the profile.
    creatorProfile: { findUnique: jest.fn(), update: jest.fn() },
    creatorPortfolioVideo: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
  };

  const storageMock = {
    buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
    buildObjectKey: jest.fn(() => videoKey),
    createPresignedPutUpload: jest.fn(async () => ({
      key: videoKey,
      uploadUrl: 'https://s3.example/upload',
      headers: {},
      expiresInSeconds: 900,
      cdnUrl: `https://cdn.example/${videoKey}`,
    })),
    createMultipartUpload: jest.fn(async () => ({
      key: videoKey,
      uploadId: 'upload-1',
      cdnUrl: `https://cdn.example/${videoKey}`,
      partSizeBytes: 10 * 1024 * 1024,
      expiresInSeconds: 900,
    })),
  };

  let service: CreatorPortfolioService;

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    prismaMock.creatorPortfolioVideo.findFirst.mockResolvedValue(null);
    service = new CreatorPortfolioService(
      prismaMock as never,
      storageMock as never,
      configMock as never,
    );
  });

  it('refuses a single-PUT presign for a file already in the portfolio', async () => {
    prismaMock.creatorPortfolioVideo.findFirst.mockResolvedValue({ id: 'dup' });

    await expect(
      service.presignUpload(creatorUserId, {
        kind: 'video',
        contentType: 'video/mp4',
        contentHash: hash,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageMock.createPresignedPutUpload).not.toHaveBeenCalled();
  });

  it('refuses a multipart upload for a file already in the portfolio', async () => {
    prismaMock.creatorPortfolioVideo.findFirst.mockResolvedValue({ id: 'dup' });

    await expect(
      service.createMultipartUpload(creatorUserId, {
        kind: 'video',
        contentType: 'video/mp4',
        contentLength: 50_000_000,
        contentHash: hash,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageMock.createMultipartUpload).not.toHaveBeenCalled();
  });

  it('matches the hash case-insensitively', async () => {
    prismaMock.creatorPortfolioVideo.findFirst.mockResolvedValue({ id: 'dup' });

    await expect(
      service.presignUpload(creatorUserId, {
        kind: 'video',
        contentType: 'video/mp4',
        contentHash: hash.toUpperCase(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prismaMock.creatorPortfolioVideo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { creatorId: creatorProfileId, contentHash: hash },
      }),
    );
  });

  it('allows the upload when no hash is supplied', async () => {
    await service.presignUpload(creatorUserId, {
      kind: 'video',
      contentType: 'video/mp4',
    });

    expect(prismaMock.creatorPortfolioVideo.findFirst).not.toHaveBeenCalled();
    expect(storageMock.createPresignedPutUpload).toHaveBeenCalled();
  });

  it('does not dedupe thumbnails', async () => {
    await service.presignUpload(creatorUserId, {
      kind: 'thumbnail',
      contentType: 'image/jpeg',
      contentHash: hash,
    });

    expect(prismaMock.creatorPortfolioVideo.findFirst).not.toHaveBeenCalled();
  });

  it('stores the hash lower-cased on create', async () => {
    prismaMock.creatorPortfolioVideo.create.mockResolvedValue({
      id: 'video-1',
      creatorId: creatorProfileId,
      videoUrl: `https://cdn.example/${videoKey}`,
      thumbnailUrl: null,
      tags: [],
      visibilityStatus: 'PRIVATE',
      createdAt: new Date(0),
    });

    await service.createVideo(creatorUserId, {
      videoKey,
      contentHash: hash.toUpperCase(),
    });

    expect(prismaMock.creatorPortfolioVideo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contentHash: hash }),
      }),
    );
  });

  it('turns the unique-index race into a 400, not a 500', async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['creatorId', 'contentHash'] },
      },
    );
    prismaMock.creatorPortfolioVideo.create.mockRejectedValue(conflict);

    await expect(
      service.createVideo(creatorUserId, {
        videoKey,
        contentHash: hash,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lets an unrelated Prisma error through unchanged', async () => {
    const other = new Prisma.PrismaClientKnownRequestError('Nope', {
      code: 'P2003',
      clientVersion: 'test',
    });
    prismaMock.creatorPortfolioVideo.create.mockRejectedValue(other);

    await expect(
      service.createVideo(creatorUserId, {
        videoKey,
      }),
    ).rejects.toBe(other);
  });
});

describe('CreatorPortfolioService Instagram import', () => {
  const creatorUserId = 'creator-user';
  const creatorProfileId = 'profile-1';
  const videoKey = `creator-portfolio/${creatorProfileId}/videos/new.mp4`;
  const thumbKey = `creator-portfolio/${creatorProfileId}/thumbnails/new.jpg`;

  const prismaMock = {
    creatorProfile: { findUnique: jest.fn(), update: jest.fn() },
    creatorPortfolioVideo: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    instagramMediaItem: { findMany: jest.fn(), update: jest.fn() },
  };
  const storageMock = {
    buildCdnUrl: jest.fn((k: string) => `https://cdn.example/${k}`),
    buildObjectKey: jest.fn(({ kind }: { kind: string }) =>
      kind === 'creator_portfolio_video' ? videoKey : thumbKey,
    ),
  };
  let mode: string;
  const configMock = {
    get: jest.fn((key: string, fallback?: unknown) =>
      key === 'PORTFOLIO_IG_IMPORT_MODE' ? mode : fallback,
    ),
  };

  let service: CreatorPortfolioService;

  const cached = (over: Record<string, unknown> = {}) => ({
    id: 'cache-1',
    igMediaId: 'reel-1',
    permalink: 'https://www.instagram.com/reel/abc/',
    postedAt: new Date('2026-07-01T00:00:00Z'),
    mediaUrl: 'https://scontent.cdninstagram.com/reel-1.mp4',
    mediaProductType: 'REELS',
    importedVideoId: null,
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mode = 'mirror';
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: creatorProfileId,
      userId: creatorUserId,
    });
    prismaMock.creatorPortfolioVideo.findMany.mockResolvedValue([]);
    prismaMock.creatorPortfolioVideo.create.mockResolvedValue({
      id: 'video-1',
      assetState: 'PROCESSING',
    });
    service = new CreatorPortfolioService(
      prismaMock as never,
      storageMock as never,
      configMock as never,
    );
  });

  it('refuses an id that is not cached against this creator', async () => {
    // The scoped cache lookup is the authorization boundary: a guessed id from
    // another creator's account simply is not returned.
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['someone-elses-reel'],
    });

    expect(result.imported).toHaveLength(0);
    expect(result.skipped).toEqual([
      { igMediaId: 'someone-elses-reel', reason: 'not_found' },
    ]);
    expect(prismaMock.creatorPortfolioVideo.create).not.toHaveBeenCalled();
  });

  it('scopes the cache lookup to the creator own connections', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);
    await service.importInstagramReels(creatorUserId, { igMediaIds: ['r'] });
    expect(prismaMock.instagramMediaItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          connection: { creatorProfileId },
        }),
      }),
    );
  });

  it('creates a PROCESSING row with its S3 key already allocated', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([cached()]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.imported).toEqual([
      { id: 'video-1', igMediaId: 'reel-1', assetState: 'PROCESSING' },
    ]);
    const { data } = prismaMock.creatorPortfolioVideo.create.mock.calls[0]![0];
    expect(data).toMatchObject({
      source: 'INSTAGRAM',
      assetState: 'PROCESSING',
      videoKey,
      igMediaId: 'reel-1',
      visibilityStatus: 'PUBLIC',
    });
    // Not playable yet, so no URL is published.
    expect(data.videoUrl).toBeNull();
  });

  it('dims the reel in the gallery once imported', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([cached()]);
    await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });
    expect(prismaMock.instagramMediaItem.update).toHaveBeenCalledWith({
      where: { id: 'cache-1' },
      data: { importedVideoId: 'video-1' },
    });
  });

  it('skips a reel the creator already imported', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([cached()]);
    prismaMock.creatorPortfolioVideo.findMany.mockResolvedValue([
      { igMediaId: 'reel-1' },
    ]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.skipped).toEqual([
      { igMediaId: 'reel-1', reason: 'already_imported' },
    ]);
    expect(prismaMock.creatorPortfolioVideo.create).not.toHaveBeenCalled();
  });

  it('re-asserts the reels filter as defence in depth', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([
      cached({ mediaProductType: 'FEED' }),
    ]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.skipped).toEqual([
      { igMediaId: 'reel-1', reason: 'not_a_reel' },
    ]);
  });

  it('skips a reel with no media URL when it has to be mirrored', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([
      cached({ mediaUrl: null }),
    ]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.skipped).toEqual([
      { igMediaId: 'reel-1', reason: 'no_media_url' },
    ]);
  });

  it('stores the Instagram URL directly in link mode', async () => {
    mode = 'link';
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([cached()]);
    prismaMock.creatorPortfolioVideo.create.mockResolvedValue({
      id: 'video-1',
      assetState: 'LINK_ONLY',
    });

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    const { data } = prismaMock.creatorPortfolioVideo.create.mock.calls[0]![0];
    expect(data).toMatchObject({
      assetState: 'LINK_ONLY',
      videoKey: null,
      videoUrl: 'https://scontent.cdninstagram.com/reel-1.mp4',
    });
    // Nothing to mirror in link mode.
    expect((result as { mirrorVideoIds?: string[] }).mirrorVideoIds).toEqual(
      [],
    );
  });

  it('reports the unique-index race as already_imported, not a 500', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([cached()]);
    prismaMock.creatorPortfolioVideo.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['creatorId', 'igMediaId'] },
      }),
    );

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.skipped).toEqual([
      { igMediaId: 'reel-1', reason: 'already_imported' },
    ]);
  });

  it('skips a reel Instagram gave no media_url for', async () => {
    // Meta omits media_url for media containing copyrighted material —
    // licensed audio on a reel — so there is no file to fetch.
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([
      cached({ mediaUrl: null }),
    ]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.imported).toEqual([]);
    expect(result.skipped).toEqual([
      { igMediaId: 'reel-1', reason: 'no_media_url' },
    ]);
    expect(prismaMock.creatorPortfolioVideo.create).not.toHaveBeenCalled();
  });

  it('skips it in link mode too, rather than storing a null videoUrl', async () => {
    // This used to fall through: link mode created a LINK_ONLY row with
    // videoUrl null, and LINK_ONLY counts as playable, so it surfaced on the
    // public profile as an empty player.
    mode = 'link';
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([
      cached({ mediaUrl: null }),
    ]);

    const result = await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1'],
    });

    expect(result.skipped).toEqual([
      { igMediaId: 'reel-1', reason: 'no_media_url' },
    ]);
    expect(prismaMock.creatorPortfolioVideo.create).not.toHaveBeenCalled();
  });

  it('hands back exactly the videos needing a mirror', async () => {
    prismaMock.instagramMediaItem.findMany.mockResolvedValue([
      cached(),
      cached({ id: 'cache-2', igMediaId: 'reel-2' }),
    ]);
    prismaMock.creatorPortfolioVideo.create
      .mockResolvedValueOnce({ id: 'video-1', assetState: 'PROCESSING' })
      .mockResolvedValueOnce({ id: 'video-2', assetState: 'PROCESSING' });

    const result = (await service.importInstagramReels(creatorUserId, {
      igMediaIds: ['reel-1', 'reel-2'],
    })) as { mirrorVideoIds?: string[] };

    expect(result.mirrorVideoIds).toEqual(['video-1', 'video-2']);
  });
});

describe('CreatorPortfolioService assertOwnedFailedImport', () => {
  const adminUserId = 'admin-user';
  const creatorUserId = 'creator-user';
  const creatorProfileId = 'profile-1';
  const videoId = 'video-1';

  const prismaMock = {
    user: { findUnique: jest.fn() },
    creatorProfile: { findUnique: jest.fn() },
    creatorPortfolioVideo: { findUnique: jest.fn() },
  };

  let service: CreatorPortfolioService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CreatorPortfolioService(
      prismaMock as never,
      {} as never,
      configMock as never,
    );
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
      creatorId: creatorProfileId,
      source: 'INSTAGRAM',
      assetState: 'FAILED',
    });
  });

  function asOwnCreator() {
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: creatorProfileId,
      userId: creatorUserId,
    });
  }

  it('lets the owning creator retry their own failed import', async () => {
    asOwnCreator();

    await expect(
      service.assertOwnedFailedImport(creatorUserId, videoId),
    ).resolves.toBeUndefined();
  });

  it('lets an admin retry on a named creator behalf', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      primaryRole: { name: RoleName.ADMIN },
      userRoles: [],
    });
    prismaMock.creatorProfile.findUnique.mockResolvedValue({
      id: creatorProfileId,
      userId: creatorUserId,
    });

    await expect(
      service.assertOwnedFailedImport(adminUserId, videoId, creatorProfileId),
    ).resolves.toBeUndefined();
  });

  it('refuses a non-admin naming another creator', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      primaryRole: { name: RoleName.CREATOR },
      userRoles: [],
    });

    await expect(
      service.assertOwnedFailedImport(creatorUserId, videoId, 'someone-else'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a video belonging to a different creator', async () => {
    asOwnCreator();
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
      creatorId: 'other-profile',
      source: 'INSTAGRAM',
      assetState: 'FAILED',
    });

    await expect(
      service.assertOwnedFailedImport(creatorUserId, videoId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a video that is not failed', async () => {
    asOwnCreator();
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
      creatorId: creatorProfileId,
      source: 'INSTAGRAM',
      assetState: 'READY',
    });

    await expect(
      service.assertOwnedFailedImport(creatorUserId, videoId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses an uploaded video, which is never mirrored', async () => {
    asOwnCreator();
    prismaMock.creatorPortfolioVideo.findUnique.mockResolvedValue({
      creatorId: creatorProfileId,
      source: 'UPLOAD',
      assetState: 'FAILED',
    });

    await expect(
      service.assertOwnedFailedImport(creatorUserId, videoId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
