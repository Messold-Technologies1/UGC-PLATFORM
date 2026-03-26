import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCreatorProfileDto,
  CreatorPackageCreateDto,
} from './dto/create-creator-profile.dto';
import { CreatorProfileService } from './creator-profile.service';

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
  serviceType: {
    findMany: TxAsyncMock;
    createMany: TxAsyncMock;
  };
  creatorLanguage: {
    createMany: TxAsyncMock;
  };
  creatorService: {
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
    serviceType: {
      findMany: createTxAsyncMock(),
      createMany: createTxAsyncMock(),
    },
    creatorLanguage: {
      createMany: createTxAsyncMock(),
    },
    creatorService: {
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
    serviceType: txMock.serviceType,
    creatorLanguage: txMock.creatorLanguage,
    creatorService: txMock.creatorService,
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
    txMock.serviceType.findMany.mockReset();
    txMock.serviceType.createMany.mockReset();
    txMock.creatorLanguage.createMany.mockReset();
    txMock.creatorService.createMany.mockReset();
    txMock.role.findUnique.mockReset();
    txMock.user.update.mockReset();
    txMock.userRole.upsert.mockReset();
    txMock.creatorPackage.createMany.mockReset();
    creatorPackageService.createPackages.mockReset();

    service = new CreatorProfileService(
      prismaMock as unknown as PrismaService,
      creatorPackageService as unknown as CreatorPackageService,
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

  it('creates profile, languages, services, packages, and updates CREATOR role', async () => {
    const profileId = 'profile-1';
    const st1 = { id: 'st-1', name: 'Video Editing' };
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
        ageRange: null,
        travelRadius: null,
        languages: [{ id: 'lang-1', language: 'English' }],
        services: [
          {
            id: 'cs-1',
            serviceTypeId: st1.id,
            serviceType: { id: st1.id, name: st1.name },
          },
        ],
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

    txMock.serviceType.findMany.mockResolvedValueOnce([st1]);

    txMock.creatorProfile.create.mockResolvedValueOnce({ id: profileId });
    txMock.role.findUnique.mockResolvedValueOnce(role);

    const dto: CreateCreatorProfileDto = {
      displayName: 'Jane',
      languages: ['English'],
      serviceTypeNames: ['Video Editing'],
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
    expect(txMock.creatorService.createMany).toHaveBeenCalled();
    expect(creatorPackageService.createPackages).toHaveBeenCalled();

    expect(txMock.user.update).toHaveBeenCalledWith({
      where: { id: creatorId },
      data: { primaryRoleId: role.id },
    });

    expect(txMock.userRole.upsert).toHaveBeenCalled();
  });

  it('auto-creates missing ServiceType names for serviceTypeNames', async () => {
    const profileId = 'profile-1';
    const st1 = { id: 'st-1', name: 'Video Editing' };
    const st2 = { id: 'st-2', name: 'Unknown Service' };
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
        ageRange: null,
        travelRadius: null,
        languages: [],
        services: [
          {
            id: 'cs-1',
            serviceTypeId: st1.id,
            serviceType: { id: st1.id, name: st1.name },
          },
          {
            id: 'cs-2',
            serviceTypeId: st2.id,
            serviceType: { id: st2.id, name: st2.name },
          },
        ],
        packages: [],
      }); // final fetch

    txMock.serviceType.findMany
      .mockResolvedValueOnce([st1]) // first fetch for existing names
      .mockResolvedValueOnce([st1, st2]); // second fetch after createMany

    txMock.serviceType.createMany.mockResolvedValueOnce({ count: 1 });

    txMock.creatorProfile.create.mockResolvedValueOnce({ id: profileId });
    txMock.role.findUnique.mockResolvedValueOnce(role);

    const dto: CreateCreatorProfileDto = {
      displayName: 'Jane',
      serviceTypeNames: ['Video Editing', 'Unknown Service'],
    };

    const result = await service.createCreatorProfile(creatorId, dto);

    expect(result.id).toBe(profileId);
    expect(txMock.serviceType.createMany).toHaveBeenCalled();
    expect(txMock.creatorService.createMany).toHaveBeenCalled();
    expect(creatorPackageService.createPackages).not.toHaveBeenCalled();
  });
});
