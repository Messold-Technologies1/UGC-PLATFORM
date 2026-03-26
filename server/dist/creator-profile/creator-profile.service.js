"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CreatorProfileService", {
    enumerable: true,
    get: function() {
        return CreatorProfileService;
    }
});
const _common = require("@nestjs/common");
const _client = require("@prisma/client");
const _prismaservice = require("../prisma/prisma.service");
const _creatorpackageservice = require("../creator-package/creator-package.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const creatorProfileWithRelationsInclude = {
    languages: true,
    services: {
        include: {
            serviceType: true
        }
    },
    packages: true
};
function mapJsonDeliverables(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item)=>typeof item === 'string');
}
let CreatorProfileService = class CreatorProfileService {
    mapCreatorProfile(profile) {
        const packages = profile.packages ?? [];
        return {
            ...profile,
            packages: packages.map(({ deliverables, priceAmount, ...rest })=>({
                    ...rest,
                    deliverables: mapJsonDeliverables(deliverables),
                    priceAmount: typeof priceAmount?.toString === 'function' ? priceAmount.toString() : String(priceAmount)
                }))
        };
    }
    async isAdmin(userId, tx) {
        const user = await tx.user.findUnique({
            where: {
                id: userId
            },
            select: {
                primaryRole: {
                    select: {
                        name: true
                    }
                },
                userRoles: {
                    select: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });
        if (!user) return false;
        if (user.primaryRole?.name === _client.RoleName.ADMIN) return true;
        return user.userRoles?.some((ur)=>ur.role?.name === _client.RoleName.ADMIN) ?? false;
    }
    async resolveServiceTypes(serviceTypeNamesUnique) {
        if (serviceTypeNamesUnique.length === 0) return [];
        const existing = await this.prisma.serviceType.findMany({
            where: {
                name: {
                    in: serviceTypeNamesUnique
                }
            },
            select: {
                id: true,
                name: true
            }
        });
        const found = new Set(existing.map((s)=>s.name));
        const missing = serviceTypeNamesUnique.filter((n)=>!found.has(n));
        if (missing.length > 0) {
            // Allow "free-form" service types by auto-creating missing `ServiceType.name` values.
            await this.prisma.serviceType.createMany({
                data: missing.map((name)=>({
                        name
                    })),
                skipDuplicates: true
            });
            return this.prisma.serviceType.findMany({
                where: {
                    name: {
                        in: serviceTypeNamesUnique
                    }
                },
                select: {
                    id: true,
                    name: true
                }
            });
        }
        return existing;
    }
    async createCreatorProfile(userId, dto) {
        const normalizedLanguages = (dto.languages ?? []).map((l)=>l.trim()).filter(Boolean);
        const normalizedServiceTypeNamesUnique = [
            ...new Set((dto.serviceTypeNames ?? []).map((n)=>n.trim()).filter(Boolean))
        ];
        const resolvedServiceTypes = await this.resolveServiceTypes(normalizedServiceTypeNamesUnique);
        const creatorProfileId = await this.prisma.$transaction(async (tx)=>{
            const existing = await tx.creatorProfile.findUnique({
                where: {
                    userId
                }
            });
            if (existing) {
                throw new _common.ConflictException('Creator profile already exists');
            }
            const creatorProfile = await tx.creatorProfile.create({
                data: {
                    userId,
                    displayName: dto.displayName,
                    city: dto.city ?? null,
                    bio: dto.bio ?? null,
                    gender: dto.gender ?? null,
                    ageRange: dto.ageRange ?? null,
                    travelRadius: dto.travelRadius ?? null
                }
            });
            // Independent writes: can be done in parallel once we have creatorProfile.id.
            const ops = [];
            if (normalizedLanguages.length > 0) {
                ops.push(tx.creatorLanguage.createMany({
                    data: normalizedLanguages.map((language)=>({
                            creatorId: creatorProfile.id,
                            language
                        })),
                    skipDuplicates: true
                }));
            }
            if (resolvedServiceTypes.length > 0) {
                ops.push(tx.creatorService.createMany({
                    data: resolvedServiceTypes.map((serviceType)=>({
                            creatorId: creatorProfile.id,
                            serviceTypeId: serviceType.id
                        })),
                    skipDuplicates: true
                }));
            }
            if (dto.packages?.length) {
                ops.push(this.creatorPackageService.createPackages(tx, creatorProfile.id, dto.packages));
            }
            await Promise.all(ops);
            // Strict consistency: role update stays in the same transaction.
            const creatorRole = await tx.role.findUnique({
                where: {
                    name: _client.RoleName.CREATOR
                }
            });
            if (!creatorRole) {
                throw new Error('Missing Role: CREATOR');
            }
            await tx.user.update({
                where: {
                    id: userId
                },
                data: {
                    primaryRoleId: creatorRole.id
                }
            });
            await tx.userRole.upsert({
                where: {
                    userId_roleId: {
                        userId,
                        roleId: creatorRole.id
                    }
                },
                create: {
                    userId,
                    roleId: creatorRole.id
                },
                update: {
                    roleId: creatorRole.id
                }
            });
            return creatorProfile.id;
        }, {
            timeout: 30_000,
            maxWait: 10_000
        });
        // Fetch after commit to keep the transaction fast and avoid interactive tx timeouts.
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                id: creatorProfileId
            },
            include: creatorProfileWithRelationsInclude
        });
        if (!profile) {
            throw new Error('Creator profile creation failed');
        }
        return this.mapCreatorProfile(profile);
    }
    async listCreators(query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;
        const [total, items] = await this.prisma.$transaction([
            this.prisma.creatorProfile.count(),
            this.prisma.creatorProfile.findMany({
                take: limit,
                skip,
                orderBy: {
                    createdAt: 'desc'
                },
                include: creatorProfileWithRelationsInclude
            })
        ]);
        return {
            items: items.map((p)=>this.mapCreatorProfile(p)),
            total,
            page,
            limit
        };
    }
    async getCreatorById(id) {
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                id
            },
            include: creatorProfileWithRelationsInclude
        });
        if (!profile) {
            throw new _common.NotFoundException('Creator not found');
        }
        return this.mapCreatorProfile(profile);
    }
    async updateCreatorProfile(actingUserId, creatorProfileId, dto) {
        return this.prisma.$transaction(async (tx)=>{
            const profile = await tx.creatorProfile.findUnique({
                where: {
                    id: creatorProfileId
                }
            });
            if (!profile) {
                throw new _common.NotFoundException('Creator not found');
            }
            const allowed = profile.userId === actingUserId || await this.isAdmin(actingUserId, tx);
            if (!allowed) {
                throw new _common.ForbiddenException('Not allowed to update this creator profile');
            }
            await tx.creatorProfile.update({
                where: {
                    id: creatorProfileId
                },
                data: {
                    displayName: dto.displayName ?? undefined,
                    city: dto.city ?? undefined,
                    bio: dto.bio ?? undefined,
                    gender: dto.gender ?? undefined,
                    ageRange: dto.ageRange ?? undefined,
                    travelRadius: dto.travelRadius ?? undefined
                }
            });
            if (dto.languages) {
                const normalized = dto.languages.map((l)=>l.trim()).filter(Boolean);
                await tx.creatorLanguage.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                if (normalized.length > 0) {
                    await tx.creatorLanguage.createMany({
                        data: normalized.map((language)=>({
                                creatorId: creatorProfileId,
                                language
                            })),
                        skipDuplicates: true
                    });
                }
            }
            if (dto.serviceTypeNames) {
                const names = dto.serviceTypeNames.map((n)=>n.trim()).filter(Boolean);
                const uniqueNames = [
                    ...new Set(names)
                ];
                let serviceTypes = await tx.serviceType.findMany({
                    where: {
                        name: {
                            in: uniqueNames
                        }
                    },
                    select: {
                        id: true,
                        name: true
                    }
                });
                const found = new Set(serviceTypes.map((s)=>s.name));
                const missing = uniqueNames.filter((n)=>!found.has(n));
                if (missing.length > 0) {
                    // Allow "free-form" service types by auto-creating missing `ServiceType.name` values.
                    await tx.serviceType.createMany({
                        data: missing.map((name)=>({
                                name
                            })),
                        skipDuplicates: true
                    });
                    serviceTypes = await tx.serviceType.findMany({
                        where: {
                            name: {
                                in: uniqueNames
                            }
                        },
                        select: {
                            id: true,
                            name: true
                        }
                    });
                }
                await tx.creatorService.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                if (serviceTypes.length > 0) {
                    await tx.creatorService.createMany({
                        data: serviceTypes.map((st)=>({
                                creatorId: creatorProfileId,
                                serviceTypeId: st.id
                            })),
                        skipDuplicates: true
                    });
                }
            }
            if (dto.packages) {
                await tx.creatorPackage.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                await this.creatorPackageService.createPackages(tx, creatorProfileId, dto.packages);
            }
            const updated = await tx.creatorProfile.findUnique({
                where: {
                    id: creatorProfileId
                },
                include: creatorProfileWithRelationsInclude
            });
            if (!updated) {
                throw new Error('Creator profile update failed');
            }
            return this.mapCreatorProfile(updated);
        }, {
            timeout: 30_000,
            maxWait: 10_000
        });
    }
    async deleteCreatorProfile(actingUserId, creatorProfileId) {
        await this.prisma.$transaction(async (tx)=>{
            const profile = await tx.creatorProfile.findUnique({
                where: {
                    id: creatorProfileId
                }
            });
            if (!profile) {
                throw new _common.NotFoundException('Creator not found');
            }
            const allowed = profile.userId === actingUserId || await this.isAdmin(actingUserId, tx);
            if (!allowed) {
                throw new _common.ForbiddenException('Not allowed to delete this creator profile');
            }
            await tx.creatorProfile.delete({
                where: {
                    id: creatorProfileId
                }
            });
        }, {
            timeout: 30_000,
            maxWait: 10_000
        });
    }
    constructor(prisma, creatorPackageService){
        this.prisma = prisma;
        this.creatorPackageService = creatorPackageService;
    }
};
CreatorProfileService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _creatorpackageservice.CreatorPackageService === "undefined" ? Object : _creatorpackageservice.CreatorPackageService
    ])
], CreatorProfileService);

//# sourceMappingURL=creator-profile.service.js.map