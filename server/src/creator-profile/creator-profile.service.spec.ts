import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { CREATOR_ADDON_OPTION_SEED_ROWS } from '../../prisma/creator-addon-options-seed';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorPackageCreateDto } from './dto/create-creator-profile.dto';
import type { CreateCreatorProfileAtSignupInput } from './dto/create-creator-profile-at-signup.input';
import { CreatorFacetDimension } from '@prisma/client';
import { CreatorProfileService } from './creator-profile.service';
import { CreatorReviewsService } from '../creator-reviews/creator-reviews.service';
import { StorageService } from '../storage/storage.service';

const mockCreatorAddOnOptionsForCatalog = CREATOR_ADDON_OPTION_SEED_ROWS.map(
  (row) => ({
    slug: row.slug,
    name: row.name,
    fixedPrice: row.fixedPrice ?? null,
    minPrice: row.minPrice ?? null,
    stepPrice: row.stepPrice ?? null,
  }),
);

/** Async Prisma delegate mock used in interactive transaction tests */
type TxAsyncMock = jest.Mock<Promise<unknown>, unknown[]>;

function createTxAsyncMock(): TxAsyncMock {
  return jest.fn() as unknown as TxAsyncMock;
}

interface TxMock {
  creatorProfile: {
    findUnique: TxAsyncMock;
    create: TxAsyncMock;
    update: TxAsyncMock;
  };
  creatorProfileFacetSelection: {
    deleteMany: TxAsyncMock;
    createMany: TxAsyncMock;
  };
  creatorProfileLanguage: {
    deleteMany: TxAsyncMock;
    createMany: TxAsyncMock;
  };
  creatorFacetOption: {
    findUnique: TxAsyncMock;
  };
  creatorRestriction: {
    createMany: TxAsyncMock;
  };
  creatorAddOn: {
    createMany: TxAsyncMock;
    deleteMany: TxAsyncMock;
  };
  creatorAddOnOption: {
    findMany: TxAsyncMock;
  };
  role: {
    findUnique: TxAsyncMock;
  };
  user: {
    update: TxAsyncMock;
    findUnique: TxAsyncMock;
  };
  userRole: {
    upsert: TxAsyncMock;
  };
  creatorPackage: {
    createMany: TxAsyncMock;
  };
}

describe('CreatorProfileService', () => {
  const creatorId = 'creator-user-1';

  const txMock: TxMock = {
    creatorProfile: {
      findUnique: createTxAsyncMock(),
      create: createTxAsyncMock(),
      update: createTxAsyncMock(),
    },
    creatorProfileFacetSelection: {
      deleteMany: createTxAsyncMock(),
      createMany: createTxAsyncMock(),
    },
    creatorProfileLanguage: {
      deleteMany: createTxAsyncMock(),
      createMany: createTxAsyncMock(),
    },
    creatorFacetOption: {
      findUnique: createTxAsyncMock(),
    },
    creatorRestriction: {
      createMany: createTxAsyncMock(),
    },
    creatorAddOn: {
      createMany: createTxAsyncMock(),
      deleteMany: createTxAsyncMock(),
    },
    creatorAddOnOption: {
      findMany: createTxAsyncMock(),
    },
    role: {
      findUnique: createTxAsyncMock(),
    },
    user: {
      update: createTxAsyncMock(),
      findUnique: createTxAsyncMock(),
    },
    userRole: {
      upsert: createTxAsyncMock(),
    },
    creatorPackage: {
      createMany: createTxAsyncMock(),
    },
  };

  const prismaUserFindUnique = jest.fn();

  const prismaMock = {
    $transaction: jest.fn(
      (fn: (tx: TxMock) => Promise<unknown>): Promise<unknown> =>
        Promise.resolve(fn(txMock)),
    ),
    order: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    creatorProfile: {
      findUnique: txMock.creatorProfile.findUnique,
      count: jest.fn(),
      findMany: jest.fn(),
    },
    creatorFacetOption: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: prismaUserFindUnique,
    },
    creatorLanguage: txMock.creatorProfileLanguage,
    creatorRestriction: txMock.creatorRestriction,
    creatorAddOn: txMock.creatorAddOn,
    role: txMock.role,
    userRole: txMock.userRole,
    creatorPackage: txMock.creatorPackage,
  };

  const creatorPackageService = {
    createPackages: jest.fn(
      async (
        tx: TxMock,
        id: string,
        packages: CreatorPackageCreateDto[],
      ): Promise<void> => {
        await tx.creatorPackage.createMany({
          data: packages.map((pkg) => ({
            creatorId: id,
            name: pkg.name,
            deliverables: pkg.deliverables,
            priceAmount: new Prisma.Decimal(pkg.priceAmount),
            deliveryDays: pkg.deliveryDays,
            maxRevisions: pkg.maxRevisions,
          })),
        });
      },
    ),
  };

  let service: CreatorProfileService;

  beforeEach(() => {
    txMock.creatorProfile.findUnique.mockReset();
    txMock.creatorProfile.create.mockReset();
    txMock.creatorProfile.update.mockReset();
    txMock.creatorProfileFacetSelection.deleteMany.mockReset();
    txMock.creatorProfileFacetSelection.createMany.mockReset();
    txMock.creatorProfileLanguage.deleteMany.mockReset();
    txMock.creatorProfileLanguage.createMany.mockReset();
    txMock.creatorFacetOption.findUnique.mockReset();
    txMock.creatorRestriction.createMany.mockReset();
    txMock.creatorAddOn.createMany.mockReset();
    txMock.creatorAddOn.deleteMany.mockReset();
    txMock.creatorAddOnOption.findMany.mockReset();
    txMock.creatorAddOnOption.findMany.mockResolvedValue(
      mockCreatorAddOnOptionsForCatalog,
    );
    txMock.role.findUnique.mockReset();
    txMock.user.update.mockReset();
    txMock.user.findUnique.mockReset();
    txMock.user.findUnique.mockResolvedValue({
      primaryRoleId: null,
    });
    txMock.userRole.upsert.mockReset();
    txMock.creatorPackage.createMany.mockReset();
    creatorPackageService.createPackages.mockReset();
    prismaUserFindUnique.mockReset();
    prismaUserFindUnique.mockResolvedValue({
      phoneVerified: true,
      phone: '+10000000000',
    });

    txMock.creatorProfileFacetSelection.deleteMany.mockResolvedValue({
      count: 0,
    });
    txMock.creatorProfileFacetSelection.createMany.mockResolvedValue({
      count: 0,
    });
    txMock.creatorProfileLanguage.deleteMany.mockResolvedValue({ count: 0 });
    txMock.creatorProfileLanguage.createMany.mockResolvedValue({ count: 0 });

    const storageMock = {
      buildObjectKey: jest.fn(),
      createPresignedPutUpload: jest.fn(),
      buildCdnUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
    };

    prismaMock.$transaction.mockImplementation(
      (arg: unknown): Promise<unknown> => {
        if (typeof arg === 'function') {
          return Promise.resolve(arg(txMock));
        }
        if (Array.isArray(arg)) {
          return Promise.all(arg);
        }
        return Promise.resolve(arg);
      },
    );
    prismaMock.order.groupBy.mockResolvedValue([]);

    const creatorReviewsMock = {
      listTopForCreator: jest.fn().mockResolvedValue([]),
    };

    service = new CreatorProfileService(
      prismaMock as unknown as PrismaService,
      creatorPackageService as unknown as CreatorPackageService,
      storageMock as unknown as StorageService,
      {
        notifyApproved: jest.fn(),
        notifyRejected: jest.fn(),
      } as any,
      creatorReviewsMock as unknown as CreatorReviewsService,
    );
  });

  const signupInput = (): CreateCreatorProfileAtSignupInput => ({
    displayName: 'Jane',
    contactEmail: 'jane@example.com',
    dateOfBirth: '1998-01-01',
    gender: 'FEMALE',
    city: 'Bengaluru',
    stateName: 'Karnataka',
    countryName: 'India',
    categorySlugs: ['beauty'],
  });

  it('throws ConflictException if profile already exists on signup tx', async () => {
    txMock.role.findUnique.mockResolvedValueOnce({ id: 'role-creator' });
    txMock.creatorProfile.findUnique.mockResolvedValueOnce({ id: 'profile-1' });

    await expect(
      service.createCreatorProfileInTransaction(
        txMock as unknown as Parameters<
          CreatorProfileService['createCreatorProfileInTransaction']
        >[0],
        creatorId,
        signupInput(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(txMock.creatorProfile.create).not.toHaveBeenCalled();
  });

  it('creates signup profile, CONTENT_CATEGORY facets, and CREATOR role', async () => {
    const profileId = 'profile-1';
    const role = { id: 'role-creator' };

    txMock.creatorProfile.findUnique.mockResolvedValueOnce(null);
    txMock.creatorProfile.create.mockResolvedValueOnce({ id: profileId });
    txMock.role.findUnique.mockResolvedValueOnce(role);
    txMock.creatorFacetOption.findUnique.mockResolvedValueOnce({
      id: 'facet-beauty',
    });

    const id = await service.createCreatorProfileInTransaction(
      txMock as unknown as Parameters<
        CreatorProfileService['createCreatorProfileInTransaction']
      >[0],
      creatorId,
      signupInput(),
    );

    expect(id).toBe(profileId);
    expect(txMock.creatorProfileFacetSelection.deleteMany).toHaveBeenCalled();
    expect(txMock.creatorProfileFacetSelection.createMany).toHaveBeenCalled();
    expect(txMock.creatorProfileLanguage.deleteMany).not.toHaveBeenCalled();
    expect(creatorPackageService.createPackages).not.toHaveBeenCalled();
    expect(txMock.creatorAddOn.createMany).not.toHaveBeenCalled();
    expect(txMock.userRole.upsert).toHaveBeenCalled();
    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { primaryRoleId: role.id },
      }),
    );
    expect(txMock.creatorFacetOption.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dimension_slug: {
            dimension: CreatorFacetDimension.CONTENT_CATEGORY,
            slug: 'beauty',
          },
        },
      }),
    );
  });

  it('addOrUpdateAddOns replaces add-ons with the provided catalog slugs', async () => {
    const profileId = 'profile-1';
    (txMock.creatorProfile.findUnique as TxAsyncMock).mockResolvedValueOnce({
      id: profileId,
      userId: creatorId,
    });

    (txMock.creatorProfile.findUnique as TxAsyncMock).mockResolvedValueOnce({
      id: profileId,
      userId: creatorId,
      displayName: 'Jane',
      city: null,
      bio: null,
      gender: null,
      travelRadius: null,
      onLocationAvailable: true,
      countryName: null,
      stateName: null,
      dateOfBirth: null,
      shippingAddress: null,
      contactEmail: 'jane@example.com',
      instagramUrl: null,
      youtubeUrl: null,
      tiktokUrl: null,
      snapchatUrl: null,
      contentVolume: null,
      collaborationCount: 0,
      facetSelections: [],
      profileLanguages: [],
      personaTags: [],
      restrictions: [],
      packages: [],
      addOns: [],
      creatorApproval: null,
      portfolioVideos: [],
    });

    const dto = {
      addOns: [
        {
          slug: 'on_location_shoot',
          priceAmount: '500',
        },
      ],
    };

    const result = await service.addOrUpdateAddOns(creatorId, profileId, dto as any);

    expect(txMock.creatorAddOn.deleteMany).toHaveBeenCalledWith({
      where: {
        creatorId: profileId,
      },
    });
    expect(txMock.creatorAddOn.createMany).toHaveBeenCalled();
    const createManyArgUpdate = txMock.creatorAddOn.createMany.mock
      .calls[0]?.[0] as { data: { name: string }[] };
    const addOnRowsUpdate = createManyArgUpdate.data;
    expect(addOnRowsUpdate.map((r) => r.name)).toEqual([
      'On-location Shoot (25 km)',
    ]);
    expect(result.id).toBe(profileId);
  });

  describe('getCreatorById', () => {
    const minimalProfile = (overrides: Record<string, unknown> = {}) => ({
      id: 'profile-1',
      userId: 'owner-user',
      displayName: 'Jane',
      user: { phone: '+919876543210', phoneVerified: true },
      introVideoUrl: null,
      city: null,
      countryName: null,
      stateName: null,
      bio: null,
      gender: null,
      dateOfBirth: null,
      shippingAddress: null,
      contactEmail: 'jane@example.com',
      instagramUrl: 'https://instagram.com/jane',
      youtubeUrl: 'https://youtube.com/@jane',
      tiktokUrl: null,
      snapchatUrl: null,
      contentVolume: null,
      collaborationCount: 0,
      travelRadius: null,
      onLocationAvailable: false,
      facetSelections: [],
      profileLanguages: [],
      personaTags: [],
      restrictions: [],
      packages: [],
      addOns: [],
      portfolioVideos: [],
      ...overrides,
    });

    it('throws NotFound when pending and viewer is not owner or admin', async () => {
      (txMock.creatorProfile.findUnique as TxAsyncMock).mockResolvedValueOnce(
        minimalProfile({
          creatorApproval: {
            status: ApprovalStatus.PENDING,
            rejectionReason: null,
          },
        }),
      );

      await expect(
        service.getCreatorById('stranger-user', 'profile-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns profile when pending but viewer is owner', async () => {
      (txMock.creatorProfile.findUnique as TxAsyncMock).mockResolvedValueOnce(
        minimalProfile({
          userId: creatorId,
          creatorApproval: {
            status: ApprovalStatus.PENDING,
            rejectionReason: null,
          },
        }),
      );

      const result = await service.getCreatorById(creatorId, 'profile-1');
      expect(result.id).toBe('profile-1');
      expect(result.phone).toBe('+919876543210');
      expect(result.phoneVerified).toBe(true);
      expect(result.contactEmail).toBe('jane@example.com');
      expect(result.instagramUrl).toBe('https://instagram.com/jane');
      expect(result.youtubeUrl).toBe('https://youtube.com/@jane');
    });

    it('returns profile when APPROVED for any viewer', async () => {
      (txMock.creatorProfile.findUnique as TxAsyncMock).mockResolvedValueOnce(
        minimalProfile({
          creatorApproval: {
            status: ApprovalStatus.APPROVED,
            rejectionReason: null,
          },
        }),
      );

      const result = await service.getCreatorById('stranger-user', 'profile-1');
      expect(result.id).toBe('profile-1');
      expect(result).not.toHaveProperty('phone');
      expect(result).not.toHaveProperty('phoneVerified');
      expect(result).not.toHaveProperty('contactEmail');
      expect(result).not.toHaveProperty('instagramUrl');
      expect(result).not.toHaveProperty('youtubeUrl');
      expect(result).not.toHaveProperty('tiktokUrl');
      expect(result).not.toHaveProperty('snapchatUrl');
    });
  });

  it('listPendingCreatorApprovals returns signup fields without packages or languages', async () => {
    const submitted = new Date('2026-01-15T10:00:00.000Z');
    const pendingRow = {
      id: 'profile-1',
      userId: 'user-1',
      displayName: 'Jane',
      createdAt: submitted,
      contactEmail: 'jane@example.com',
      city: 'Bengaluru',
      stateName: 'Karnataka',
      countryName: 'India',
      bio: 'Short bio',
      gender: 'FEMALE',
      dateOfBirth: new Date('1998-01-01'),
      instagramUrl: 'https://instagram.com/jane',
      driveLink: 'https://drive.google.com/drive/folders/abc123',
      user: { phone: '+919876543210', phoneVerified: true },
      facetSelections: [
        {
          option: {
            dimension: CreatorFacetDimension.CONTENT_CATEGORY,
            slug: 'beauty',
            label: 'Beauty',
          },
        },
      ],
      portfolioVideos: [
        {
          id: 'vid-1',
          creatorId: 'profile-1',
          videoUrl: 'https://cdn.example.com/v.mp4',
          thumbnailUrl: null,
          tags: [],
          createdAt: submitted,
        },
      ],
      creatorApproval: { status: ApprovalStatus.PENDING },
    };

    prismaMock.creatorProfile.count.mockResolvedValueOnce(1);
    prismaMock.creatorProfile.findMany.mockResolvedValueOnce([pendingRow]);
    prismaMock.$transaction.mockImplementationOnce((arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg as Promise<unknown>[]) : Promise.resolve(arg),
    );

    const result = await service.listPendingCreatorApprovals({
      page: 1,
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'profile-1',
      displayName: 'Jane',
      phone: '+919876543210',
      phoneVerified: true,
      contactEmail: 'jane@example.com',
      city: 'Bengaluru',
      driveLink: 'https://drive.google.com/drive/folders/abc123',
      contentCategories: [{ slug: 'beauty', label: 'Beauty' }],
      approvalStatus: ApprovalStatus.PENDING,
      submittedAt: submitted,
    });
    expect(result.items[0].portfolioVideos).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('packages');
    expect(result.items[0]).not.toHaveProperty('profileLanguages');
  });
});
