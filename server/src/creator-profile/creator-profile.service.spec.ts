import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCreatorProfileDto,
  CreatorPackageCreateDto,
} from './dto/create-creator-profile.dto';
import { CreatorProfileService } from './creator-profile.service';
import { StorageService } from '../storage/storage.service';

/** Async Prisma delegate mock used in interactive transaction tests */
type TxAsyncMock = jest.Mock<Promise<unknown>, unknown[]>;

function createTxAsyncMock(): TxAsyncMock {
  return jest.fn() as unknown as TxAsyncMock;
}

interface TxMock {
  creatorProfile: {
    findUnique: TxAsyncMock;
    create: TxAsyncMock;
  };
  creatorLanguage: {
    createMany: TxAsyncMock;
  };
  creatorCategory: {
    createMany: TxAsyncMock;
  };
  creatorPersonaTag: {
    createMany: TxAsyncMock;
  };
  creatorRestriction: {
    createMany: TxAsyncMock;
  };
  role: {
    findUnique: TxAsyncMock;
  };
  user: {
    update: TxAsyncMock;
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

  // We only mock the subset of Prisma methods used by the service.
  const txMock: TxMock = {
    creatorProfile: {
      findUnique: createTxAsyncMock(),
      create: createTxAsyncMock(),
    },
    creatorLanguage: {
      createMany: createTxAsyncMock(),
    },
    creatorCategory: {
      createMany: createTxAsyncMock(),
    },
    creatorPersonaTag: {
      createMany: createTxAsyncMock(),
    },
    creatorRestriction: {
      createMany: createTxAsyncMock(),
    },
    role: {
      findUnique: createTxAsyncMock(),
    },
    user: {
      update: createTxAsyncMock(),
    },
    userRole: {
      upsert: createTxAsyncMock(),
    },
    creatorPackage: {
      createMany: createTxAsyncMock(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn(
      (fn: (tx: TxMock) => Promise<unknown>): Promise<unknown> =>
        Promise.resolve(fn(txMock)),
    ),
    creatorProfile: txMock.creatorProfile,
    creatorLanguage: txMock.creatorLanguage,
    creatorCategory: txMock.creatorCategory,
    creatorPersonaTag: txMock.creatorPersonaTag,
    creatorRestriction: txMock.creatorRestriction,
    role: txMock.role,
    user: txMock.user,
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
          })),
        });
      },
    ),
  };

  let service: CreatorProfileService;

  beforeEach(() => {
    // Reset only the methods we control; this prevents leaking `mockResolvedValueOnce` queues
    // between tests.
    txMock.creatorProfile.findUnique.mockReset();
    txMock.creatorProfile.create.mockReset();
    txMock.creatorLanguage.createMany.mockReset();
    txMock.creatorCategory.createMany.mockReset();
    txMock.creatorPersonaTag.createMany.mockReset();
    txMock.creatorRestriction.createMany.mockReset();
    txMock.role.findUnique.mockReset();
    txMock.user.update.mockReset();
    txMock.userRole.upsert.mockReset();
    txMock.creatorPackage.createMany.mockReset();
    creatorPackageService.createPackages.mockReset();

    const storageMock = {
      buildObjectKey: jest.fn(),
      createPresignedPutUpload: jest.fn(),
      buildCdnUrl: jest.fn((key: string) => `https://cdn.example.com/${key}`),
    };

    service = new CreatorProfileService(
      prismaMock as unknown as PrismaService,
      creatorPackageService as unknown as CreatorPackageService,
      storageMock as unknown as StorageService,
    );
  });

  it('throws ConflictException if profile already exists', async () => {
    txMock.creatorProfile.findUnique.mockResolvedValueOnce({ id: 'profile-1' });

    const dto: CreateCreatorProfileDto = { displayName: 'Jane' };

    await expect(
      service.createCreatorProfile(creatorId, dto),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(txMock.creatorProfile.create).not.toHaveBeenCalled();
  });

  it('creates profile, languages, categories, packages', async () => {
    const profileId = 'profile-1';
    const role = { id: 'role-creator' };

    txMock.creatorProfile.findUnique
      .mockResolvedValueOnce(null) // existing check
      .mockResolvedValue({
        id: profileId,
        userId: creatorId,
        displayName: 'Jane',
        city: null,
        bio: null,
        gender: null,
        travelRadius: null,
        onLocationAvailable: false,
        onLocationFee: null,
        languages: [{ id: 'lang-1', language: 'English' }],
        categories: [{ id: 'cat-1', category: 'UGC Video' }],
        personaTags: [{ id: 'pt-1', tag: 'Friendly' }],
        restrictions: [{ id: 'r-1', restriction: 'does not accept alcohol' }],
        packages: [
          {
            id: 'pkg-1',
            name: 'Basic',
            deliverables: ['1 Video'],
            priceAmount: new Prisma.Decimal('199.99'),
            deliveryDays: 3,
          },
        ],
      }); // final fetch

    txMock.creatorProfile.create.mockResolvedValueOnce({ id: profileId });
    txMock.role.findUnique.mockResolvedValueOnce(role);

    const dto: CreateCreatorProfileDto = {
      displayName: 'Jane',
      languages: ['English'],
      categories: ['UGC Video'],
      personaTags: ['Friendly'],
      restrictions: ['does not accept alcohol'],
      packages: [
        {
          name: 'Basic',
          deliverables: ['1 Video'],
          priceAmount: '199.99',
          deliveryDays: 3,
        },
      ],
    };

    const result = await service.createCreatorProfile(creatorId, dto);

    expect(result.id).toBe(profileId);
    expect(txMock.creatorLanguage.createMany).toHaveBeenCalled();
    expect(txMock.creatorCategory.createMany).toHaveBeenCalled();
    expect(txMock.creatorPersonaTag.createMany).toHaveBeenCalled();
    expect(txMock.creatorRestriction.createMany).toHaveBeenCalled();
    expect(creatorPackageService.createPackages).toHaveBeenCalled();
  });
});
