"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _common = require("@nestjs/common");
const _client = require("@prisma/client");
const _creatorprofileservice = require("./creator-profile.service");
describe('CreatorProfileService', ()=>{
    const creatorId = 'creator-user-1';
    // We only mock the subset of Prisma methods used by the service.
    const txMock = {
        creatorProfile: {
            findUnique: jest.fn(),
            create: jest.fn()
        },
        serviceType: {
            findMany: jest.fn(),
            createMany: jest.fn()
        },
        creatorLanguage: {
            createMany: jest.fn()
        },
        creatorService: {
            createMany: jest.fn()
        },
        role: {
            findUnique: jest.fn()
        },
        user: {
            update: jest.fn()
        },
        userRole: {
            upsert: jest.fn()
        },
        creatorPackage: {
            // Used by CreatorPackageService
            createMany: jest.fn()
        }
    };
    const prismaMock = {
        $transaction: jest.fn().mockImplementation(async (fn)=>fn(txMock)),
        creatorProfile: txMock.creatorProfile,
        serviceType: txMock.serviceType,
        creatorLanguage: txMock.creatorLanguage,
        creatorService: txMock.creatorService,
        role: txMock.role,
        user: txMock.user,
        userRole: txMock.userRole,
        creatorPackage: txMock.creatorPackage
    };
    const creatorPackageService = {
        createPackages: jest.fn(async (tx, id, packages)=>{
            await tx.creatorPackage.createMany({
                data: packages.map((pkg)=>({
                        creatorId: id,
                        name: pkg.name,
                        deliverables: pkg.deliverables,
                        priceAmount: new _client.Prisma.Decimal(pkg.priceAmount),
                        deliveryDays: pkg.deliveryDays
                    }))
            });
        })
    };
    let service;
    beforeEach(()=>{
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
        service = new _creatorprofileservice.CreatorProfileService(prismaMock, creatorPackageService);
    });
    it('throws ConflictException if profile already exists', async ()=>{
        txMock.creatorProfile.findUnique.mockResolvedValueOnce({
            id: 'profile-1'
        });
        await expect(service.createCreatorProfile(creatorId, {
            displayName: 'Jane'
        })).rejects.toBeInstanceOf(_common.ConflictException);
        expect(txMock.creatorProfile.create).not.toHaveBeenCalled();
    });
    it('creates profile, languages, services, packages, and updates CREATOR role', async ()=>{
        const profileId = 'profile-1';
        const st1 = {
            id: 'st-1',
            name: 'Video Editing'
        };
        const role = {
            id: 'role-creator'
        };
        txMock.creatorProfile.findUnique.mockResolvedValueOnce(null) // existing check
        .mockResolvedValue({
            id: profileId,
            userId: creatorId,
            displayName: 'Jane',
            city: null,
            bio: null,
            gender: null,
            ageRange: null,
            travelRadius: null,
            languages: [
                {
                    id: 'lang-1',
                    language: 'English'
                }
            ],
            services: [
                {
                    id: 'cs-1',
                    serviceTypeId: st1.id,
                    serviceType: {
                        id: st1.id,
                        name: st1.name
                    }
                }
            ],
            packages: [
                {
                    id: 'pkg-1',
                    name: 'Basic',
                    deliverables: [
                        '1 Video'
                    ],
                    priceAmount: new _client.Prisma.Decimal('199.99'),
                    deliveryDays: 3
                }
            ]
        }); // final fetch
        txMock.serviceType.findMany.mockResolvedValueOnce([
            st1
        ]);
        txMock.creatorProfile.create.mockResolvedValueOnce({
            id: profileId
        });
        txMock.role.findUnique.mockResolvedValueOnce(role);
        const dto = {
            displayName: 'Jane',
            languages: [
                'English'
            ],
            serviceTypeNames: [
                'Video Editing'
            ],
            packages: [
                {
                    name: 'Basic',
                    deliverables: [
                        '1 Video'
                    ],
                    priceAmount: '199.99',
                    deliveryDays: 3
                }
            ]
        };
        const result = await service.createCreatorProfile(creatorId, dto);
        expect(result.id).toBe(profileId);
        expect(txMock.creatorLanguage.createMany).toHaveBeenCalled();
        expect(txMock.creatorService.createMany).toHaveBeenCalled();
        expect(creatorPackageService.createPackages).toHaveBeenCalled();
        expect(txMock.user.update).toHaveBeenCalledWith({
            where: {
                id: creatorId
            },
            data: {
                primaryRoleId: role.id
            }
        });
        expect(txMock.userRole.upsert).toHaveBeenCalled();
    });
    it('auto-creates missing ServiceType names for serviceTypeNames', async ()=>{
        const profileId = 'profile-1';
        const st1 = {
            id: 'st-1',
            name: 'Video Editing'
        };
        const st2 = {
            id: 'st-2',
            name: 'Unknown Service'
        };
        const role = {
            id: 'role-creator'
        };
        txMock.creatorProfile.findUnique.mockResolvedValueOnce(null) // existing check
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
                    serviceType: {
                        id: st1.id,
                        name: st1.name
                    }
                },
                {
                    id: 'cs-2',
                    serviceTypeId: st2.id,
                    serviceType: {
                        id: st2.id,
                        name: st2.name
                    }
                }
            ],
            packages: []
        }); // final fetch
        txMock.serviceType.findMany.mockResolvedValueOnce([
            st1
        ]) // first fetch for existing names
        .mockResolvedValueOnce([
            st1,
            st2
        ]); // second fetch after createMany
        txMock.serviceType.createMany.mockResolvedValueOnce({
            count: 1
        });
        txMock.creatorProfile.create.mockResolvedValueOnce({
            id: profileId
        });
        txMock.role.findUnique.mockResolvedValueOnce(role);
        const dto = {
            displayName: 'Jane',
            serviceTypeNames: [
                'Video Editing',
                'Unknown Service'
            ]
        };
        const result = await service.createCreatorProfile(creatorId, dto);
        expect(result.id).toBe(profileId);
        expect(txMock.serviceType.createMany).toHaveBeenCalled();
        expect(txMock.creatorService.createMany).toHaveBeenCalled();
        expect(creatorPackageService.createPackages).not.toHaveBeenCalled();
    });
});

//# sourceMappingURL=creator-profile.service.spec.js.map