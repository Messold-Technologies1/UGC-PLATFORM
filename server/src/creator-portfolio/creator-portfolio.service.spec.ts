import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        creatorPortfolioVideoTag: {
          deleteMany: jest.fn(),
          createMany: jest.fn(),
        },
        creatorPortfolioVideo: { update: jest.fn() },
        portfolioIndustrySuggestion: { upsert: jest.fn() },
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
        portfolioIndustrySuggestion: { upsert: jest.fn() },
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
        industryLabel: null,
        language: null,
        description: null,
        visibilityStatus: 'PUBLIC',
        tags: [],
        createdAt: new Date(),
      },
      {
        id: 'video-2',
        creatorId: creatorProfileId,
        videoUrl: 'https://cdn.example/v2.mp4',
        thumbnailUrl: null,
        industryLabel: null,
        language: null,
        description: null,
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

    await expect(service.listAllVideosForAdmin('brand-user')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
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
