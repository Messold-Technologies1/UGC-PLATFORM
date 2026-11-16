import { ConflictException, NotFoundException } from '@nestjs/common';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { CREATOR_ADDON_OPTION_SEED_ROWS } from '../../prisma/creator-addon-options-seed';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorPackageCreateDto } from './dto/create-creator-profile.dto';
import type { CreateCreatorProfileAtSignupInput } from './dto/create-creator-profile-at-signup.input';
import { CreatorFacetDimension, CreatorGender } from '@prisma/client';
import { AdminCreatorListSegment } from './dto/admin-creator-list.dto';
import {
  MIN_PORTFOLIO_VIDEOS,
  PAYOUT_DETAILS_REQUIREMENT,
  REQUIRED_FACET_DIMENSIONS,
  REQUIRED_SECONDARY_NICHES,
} from './creator-profile-completeness.util';
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
    findFirst: TxAsyncMock;
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
    findFirst: TxAsyncMock;
  };
}

describe('CreatorProfileService', () => {
  const creatorId = 'creator-user-1';

  const txMock: TxMock = {
    creatorProfile: {
      findUnique: createTxAsyncMock(),
      findFirst: createTxAsyncMock(),
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
      findFirst: createTxAsyncMock(),
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
      findMany: jest.fn().mockResolvedValue([]),
    },
    brandWishlistCreator: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    creatorAddOnOption: {
      findUnique: jest.fn().mockResolvedValue({ name: 'Travel within City' }),
      // Used by `mandatoryAddOnNames` in the listed-completeness sweep.
      findMany: jest.fn().mockResolvedValue([]),
    },
    creatorProfile: {
      findUnique: txMock.creatorProfile.findUnique,
      count: jest.fn(),
      findMany: jest.fn(),
    },
    creatorFeature: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
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
    txMock.creatorProfile.findFirst.mockReset();
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
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.brandWishlistCreator.groupBy.mockResolvedValue([]);
    prismaMock.creatorAddOnOption.findUnique.mockResolvedValue({
      name: 'Travel within City',
    });

    const creatorReviewsMock = {
      listTopForCreator: jest.fn().mockResolvedValue([]),
    };

    service = new CreatorProfileService(
      prismaMock as unknown as PrismaService,
      creatorPackageService as unknown as CreatorPackageService,
      storageMock as unknown as StorageService,
      { emit: jest.fn().mockResolvedValue(undefined) } as any, // notification events
      creatorReviewsMock as unknown as CreatorReviewsService,
      { enabled: false, sendEvent: jest.fn() } as any,
      {
        classify: jest.fn(),
        resolveSelectionsForPersist: jest
          .fn()
          .mockImplementation((_creatorId: string, selections: unknown) =>
            Promise.resolve(selections),
          ),
      } as any,
      { enqueue: jest.fn(), enqueueDirty: jest.fn() } as any,
      { enqueueIntro: jest.fn(), enqueuePortfolio: jest.fn() } as any,
      {
        resolveBrandContext: jest.fn().mockRejectedValue(new Error('no brand')),
      } as any,
      // cities: nothing in these tests types a location, and an unresolved
      // term is exactly the "not a state" path.
      { resolveStateToCanonical: jest.fn().mockResolvedValue(null) } as any,
    );
  });

  const signupInput = (): CreateCreatorProfileAtSignupInput => ({
    displayName: 'Jane',
    contactEmail: 'jane@example.com',
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

  it('creates signup profile and CREATOR role without profile details', async () => {
    const profileId = 'profile-1';
    const role = { id: 'role-creator' };

    txMock.creatorProfile.findUnique.mockResolvedValueOnce(null);
    txMock.creatorProfile.findFirst.mockResolvedValue(null);
    txMock.creatorProfile.create.mockResolvedValueOnce({ id: profileId });
    txMock.role.findUnique.mockResolvedValueOnce(role);

    const id = await service.createCreatorProfileInTransaction(
      txMock as unknown as Parameters<
        CreatorProfileService['createCreatorProfileInTransaction']
      >[0],
      creatorId,
      signupInput(),
    );

    expect(id).toBe(profileId);
    expect(txMock.creatorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          // Opaque random token, never derived from the display name.
          publicSlug: expect.stringMatching(/^[0-9abcdefghjkmnpqrstvwxyz]{8}$/),
          displayName: 'Jane',
          contactEmail: 'jane@example.com',
        }),
      }),
    );
    expect(
      txMock.creatorProfileFacetSelection.deleteMany,
    ).not.toHaveBeenCalled();
    expect(
      txMock.creatorProfileFacetSelection.createMany,
    ).not.toHaveBeenCalled();
    expect(txMock.creatorProfileLanguage.deleteMany).not.toHaveBeenCalled();
    expect(creatorPackageService.createPackages).not.toHaveBeenCalled();
    expect(txMock.creatorAddOn.createMany).not.toHaveBeenCalled();
    expect(txMock.userRole.upsert).toHaveBeenCalled();
    expect(txMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { primaryRoleId: role.id },
      }),
    );
  });

  it('addOrUpdateAddOns replaces add-ons with the provided catalog slugs', async () => {
    const profileId = 'profile-1';
    txMock.creatorProfile.findUnique.mockResolvedValueOnce({
      id: profileId,
      userId: creatorId,
    });

    txMock.creatorProfile.findUnique.mockResolvedValueOnce({
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

    const result = await service.addOrUpdateAddOns(
      creatorId,
      profileId,
      dto as any,
    );

    expect(txMock.creatorAddOn.deleteMany).toHaveBeenCalledWith({
      where: {
        creatorId: profileId,
      },
    });
    expect(txMock.creatorAddOn.createMany).toHaveBeenCalled();
    const createManyArgUpdate = txMock.creatorAddOn.createMany.mock
      .calls[0]?.[0] as { data: { name: string }[] };
    const addOnRowsUpdate = createManyArgUpdate.data;
    expect(addOnRowsUpdate.map((r) => r.name)).toEqual(['Travel within City']);
    expect(result.id).toBe(profileId);
  });

  describe('getCreatorById', () => {
    const minimalProfile = (overrides: Record<string, unknown> = {}) => ({
      id: 'profile-1',
      userId: 'owner-user',
      displayName: 'Jane',
      user: {
        phone: '+919876543210',
        phoneVerified: true,
        phoneOtpLastStatus: 'approved',
      },
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
      txMock.creatorProfile.findUnique.mockResolvedValueOnce(
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
      txMock.creatorProfile.findUnique.mockResolvedValueOnce(
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
      expect(result.phoneOtpLastStatus).toBe('approved');
      expect(result.contactEmail).toBe('jane@example.com');
      expect(result.instagramUrl).toBe('https://instagram.com/jane');
      expect(result.youtubeUrl).toBe('https://youtube.com/@jane');
    });

    it('returns profile when APPROVED for any viewer', async () => {
      txMock.creatorProfile.findUnique.mockResolvedValueOnce(
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
      expect(result).not.toHaveProperty('phoneOtpLastStatus');
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
      Array.isArray(arg)
        ? Promise.all(arg as Promise<unknown>[])
        : Promise.resolve(arg),
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

  describe('listCreators', () => {
    it('queries Postgres and maps items', async () => {
      const row = {
        id: 'creator-1',
        userId: 'user-1',
        displayName: 'Jane',
        publicSlug: 'ab12cd34',
        introVideoUrl: null,
        profileImageUrl: 'https://cdn.example.com/jane.jpg',
        city: 'Bengaluru',
        countryName: 'India',
        stateName: 'Karnataka',
        bio: 'Bio',
        gender: 'FEMALE',
        dateOfBirth: null,
        contentVolume: null,
        collaborationCount: 0,
        onLocationAvailable: false,
      };

      prismaMock.creatorProfile.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      prismaMock.creatorProfile.findMany.mockResolvedValueOnce([row]);
      prismaMock.$transaction.mockImplementationOnce((arg: unknown) =>
        Array.isArray(arg)
          ? Promise.all(arg as Promise<unknown>[])
          : Promise.resolve(arg),
      );

      const result = await service.listCreators({ page: 1, limit: 24 } as any);

      expect(prismaMock.creatorProfile.count).toHaveBeenCalled();
      expect(prismaMock.creatorProfile.findMany).toHaveBeenCalled();
      expect(result.total).toBe(1);
      // Brands see the opaque public slug as the name, never the real name.
      expect(result.items[0]).toMatchObject({
        id: 'creator-1',
        name: 'ab12cd34',
      });
    });

    it('carries the wishlist save count onto each card', async () => {
      const row = {
        id: 'creator-1',
        publicSlug: 'ab12cd34',
        city: 'Bengaluru',
        collaborationCount: 0,
        onLocationAvailable: false,
      };

      prismaMock.creatorProfile.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      prismaMock.creatorProfile.findMany.mockResolvedValueOnce([row]);
      prismaMock.brandWishlistCreator.groupBy.mockResolvedValueOnce([
        { creatorId: 'creator-1', _count: { _all: 8 } },
      ]);

      const result = await service.listCreators({ page: 1, limit: 24 } as any);

      expect(result.items[0].savedCount).toBe(8);
    });

    it('reports zero saves for a creator no wishlist holds', async () => {
      const row = {
        id: 'creator-1',
        publicSlug: 'ab12cd34',
        city: 'Bengaluru',
        collaborationCount: 0,
        onLocationAvailable: false,
      };

      prismaMock.creatorProfile.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      prismaMock.creatorProfile.findMany.mockResolvedValueOnce([row]);
      prismaMock.brandWishlistCreator.groupBy.mockResolvedValueOnce([]);

      const result = await service.listCreators({ page: 1, limit: 24 } as any);

      expect(result.items[0].savedCount).toBe(0);
    });

    it('advertises an on-location shoot only when the add-on is priced', async () => {
      const base = {
        publicSlug: 'ab12cd34',
        city: 'Bengaluru',
        collaborationCount: 0,
        onLocationAvailable: false,
      };
      prismaMock.creatorProfile.count
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);
      prismaMock.creatorProfile.findMany.mockResolvedValueOnce([
        {
          ...base,
          id: 'travels',
          addOns: [{ name: 'Travel within City', priceAmount: '1500' }],
        },
        {
          ...base,
          id: 'listed-but-free',
          addOns: [{ name: 'Travel within City', priceAmount: '0' }],
        },
        { ...base, id: 'studio-only', addOns: [{ name: 'Rush delivery' }] },
      ]);

      const result = await service.listCreators({ page: 1, limit: 24 } as any);

      expect(
        result.items.map((item) => [item.id, item.onLocationShootAvailable]),
      ).toEqual([
        ['travels', true],
        // Priced at zero is nothing a brand can buy, so the card must not
        // promise it — the same rule the order flow applies.
        ['listed-but-free', false],
        ['studio-only', false],
      ]);
    });

    it('orders the niche facets primary first, whatever order they arrive in', async () => {
      const row = {
        id: 'creator-1',
        publicSlug: 'ab12cd34',
        city: 'Bengaluru',
        collaborationCount: 0,
        onLocationAvailable: false,
        facetSelections: [
          {
            rank: 2,
            option: {
              dimension: 'CONTENT_CATEGORY',
              slug: 'travel',
              label: 'Travel',
            },
          },
          {
            rank: 0,
            option: {
              dimension: 'CONTENT_CATEGORY',
              slug: 'beauty',
              label: 'Beauty',
            },
          },
          {
            rank: 1,
            option: {
              dimension: 'CONTENT_CATEGORY',
              slug: 'fashion',
              label: 'Fashion',
            },
          },
        ],
      };

      prismaMock.creatorProfile.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      prismaMock.creatorProfile.findMany.mockResolvedValueOnce([row]);

      const result = await service.listCreators({ page: 1, limit: 24 } as any);

      expect(result.items[0].facetSelections.map((f) => f.label)).toEqual([
        'Beauty',
        'Fashion',
        'Travel',
      ]);
    });
  });

  describe('filters reach every segment, not just the simple ones', () => {
    // Two segments cannot be expressed as a single Prisma `where` and take
    // their own code path. Both were skipping the filters while the tab
    // COUNT applied them, so "Mom creator" showed a UGC creator and the
    // number above the list disagreed with the rows in it.

    /** The `where` handed to the first creatorProfile.findMany of a call. */
    const firstWhere = (): string => {
      const call = prismaMock.creatorProfile.findMany.mock.calls[0] as [
        { where?: unknown },
      ];
      return JSON.stringify(call[0]?.where ?? {});
    };

    beforeEach(() => {
      prismaMock.creatorProfile.findMany.mockReset();
      prismaMock.creatorProfile.findMany.mockResolvedValue([]);
    });

    it('applies them on the Listed · complete tab', async () => {
      await service.listAdminCreators({
        segment: AdminCreatorListSegment.LISTED_COMPLETE,
        page: 1,
        limit: 10,
        creatorType: ['mom'],
      });
      expect(firstWhere()).toContain('mom');
    });

    it('applies them on the Listed · incomplete tab', async () => {
      await service.listAdminCreators({
        segment: AdminCreatorListSegment.LISTED_INCOMPLETE,
        page: 1,
        limit: 10,
        creatorType: ['mom'],
      });
      expect(firstWhere()).toContain('mom');
    });

    it('applies them on an ordinary segment', async () => {
      await service.listAdminCreators({
        segment: AdminCreatorListSegment.SELF_COMPLETED,
        page: 1,
        limit: 10,
        creatorType: ['mom'],
      });
      expect(firstWhere()).toContain('mom');
    });

    it('applies them on the Featured tab', async () => {
      prismaMock.creatorFeature.count.mockResolvedValue(0);
      prismaMock.creatorFeature.findMany.mockResolvedValue([]);
      await service.listAdminCreators({
        segment: AdminCreatorListSegment.FEATURED,
        page: 1,
        limit: 10,
        creatorType: ['mom'],
      });
      const call = prismaMock.creatorFeature.count.mock.calls[0] as [
        { where?: unknown },
      ];
      expect(JSON.stringify(call[0]?.where ?? {})).toContain('mom');
    });
  });

  describe('payout details across the listed cohorts', () => {
    // Two cohorts are derived from the same sweep and must disagree about
    // payout details: the admin "Listed · incomplete" tab ignores them (a
    // bank account says nothing about whether a profile is presentable),
    // while outreach counts them (having no way to pay someone is worth a
    // nudge). A single shared answer here would be the regression.

    /** A listed profile that is complete apart from having no payout method. */
    const payoutOnlyGap = {
      id: 'profile-1',
      profileImageUrl: 'https://cdn/img.jpg',
      displayName: 'Jane Doe',
      contactEmail: 'jane@example.com',
      bio: 'I make great content.',
      countryName: 'India',
      stateName: 'Karnataka',
      city: 'Bengaluru',
      gender: CreatorGender.FEMALE,
      dateOfBirth: new Date('1995-04-15'),
      shippingAddress: '221B Baker Street',
      isListed: true,
      user: { phoneOtpLastStatus: 'approved' },
      payoutDetails: null,
      facetSelections: [
        ...REQUIRED_FACET_DIMENSIONS.map((dimension) => ({
          rank: 0,
          option: { dimension },
        })),
        {
          rank: 0,
          option: { dimension: CreatorFacetDimension.CONTENT_CATEGORY },
        },
        ...Array.from({ length: REQUIRED_SECONDARY_NICHES }, (_, i) => ({
          rank: i + 1,
          option: { dimension: CreatorFacetDimension.CONTENT_CATEGORY },
        })),
      ],
      addOns: [],
      _count: { profileLanguages: 1, packages: 1, restrictions: 1 },
      portfolioVideos: Array.from({ length: MIN_PORTFOLIO_VIDEOS }, (_, i) => ({
        id: `video-${i}`,
      })),
      socialConnections: [{ id: 'ig-1' }],
    };

    it('outreach still lists a creator whose only gap is payout details', async () => {
      prismaMock.creatorProfile.findMany
        .mockResolvedValueOnce([payoutOnlyGap])
        .mockResolvedValueOnce([
          {
            id: 'profile-1',
            displayName: 'Jane Doe',
            contactEmail: 'jane@example.com',
            user: { id: 'user-1', phone: '+919876543210', phoneVerified: true },
          },
        ]);

      const cohort = await service.listListedCreatorsWithIncompleteProfiles();

      expect(cohort).toHaveLength(1);
      expect(cohort[0].missing).toEqual([PAYOUT_DETAILS_REQUIREMENT.label]);
    });

    it('the admin tab treats that same creator as complete', async () => {
      prismaMock.creatorProfile.findMany.mockResolvedValueOnce([payoutOnlyGap]);

      // Through the public entry point, so this exercises the same path the
      // admin tab does.
      const page = await service.listAdminCreators({
        segment: AdminCreatorListSegment.LISTED_INCOMPLETE,
        page: 1,
        limit: 10,
      });

      expect(page.total).toBe(0);
    });

    it('outreach and the admin tab agree on a real profile gap', async () => {
      // Instagram disconnected: not a payout question, so both must see it.
      const realGap = { ...payoutOnlyGap, socialConnections: [] };

      prismaMock.creatorProfile.findMany
        // The completeness sweep, then the page of rows it narrowed to. Only
        // the count matters here, so the page itself can come back empty.
        .mockResolvedValueOnce([realGap])
        .mockResolvedValueOnce([]);
      const page = await service.listAdminCreators({
        segment: AdminCreatorListSegment.LISTED_INCOMPLETE,
        page: 1,
        limit: 10,
      });
      expect(page.total).toBe(1);

      prismaMock.creatorProfile.findMany
        .mockResolvedValueOnce([realGap])
        .mockResolvedValueOnce([
          {
            id: 'profile-1',
            displayName: 'Jane Doe',
            contactEmail: 'jane@example.com',
            user: { id: 'user-1', phone: null, phoneVerified: false },
          },
        ]);
      const cohort = await service.listListedCreatorsWithIncompleteProfiles();
      expect(cohort[0].missing).toContain('Instagram connected');
    });
  });
});
