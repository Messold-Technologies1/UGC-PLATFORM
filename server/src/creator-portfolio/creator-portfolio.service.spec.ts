import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
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
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        creatorPortfolioVideoTag: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        creatorPortfolioVideo: { update: jest.fn() },
        portfolioIndustrySuggestion: { createMany: jest.fn() },
        portfolioLanguageSuggestion: { createMany: jest.fn() },
        portfolioTagSuggestion: { createMany: jest.fn() },
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
      industryLabel: 'Beauty',
      language: null,
      description: null,
      visibilityStatus: 'PUBLIC',
      tags: [],
      createdAt: new Date(),
    });
    prismaMock.$transaction.mockImplementationOnce((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        creatorPortfolioVideoTag: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        creatorPortfolioVideo: { update: txUpdate },
        portfolioIndustrySuggestion: { createMany: jest.fn() },
        portfolioLanguageSuggestion: { createMany: jest.fn() },
        portfolioTagSuggestion: { createMany: jest.fn() },
      }),
    );

    const result = await service.updateVideo(
      adminUserId,
      'video-1',
      { industryLabel: 'Beauty' },
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
        { description: 'Updated' },
        creatorProfileId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
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
