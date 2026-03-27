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
const _storageservice = require("../storage/storage.service");
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
    categories: true,
    personaTags: true,
    restrictions: true,
    packages: true
};
function mapJsonDeliverables(value) {
    if (!Array.isArray(value)) return [];
    return value.filter((item)=>typeof item === 'string');
}
let CreatorProfileService = class CreatorProfileService {
    async presignProfileImageUpload(userId, dto) {
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                userId
            },
            select: {
                id: true
            }
        });
        const key = this.storage.buildObjectKey({
            kind: 'creator_profile_image',
            userId,
            creatorProfileId: profile?.id,
            contentType: dto.contentType
        });
        return this.storage.createPresignedPutUpload({
            key,
            contentType: dto.contentType,
            contentLength: dto.contentLength
        });
    }
    assertProfileImageKeyOwner(creatorProfileId, key) {
        const prefix = `creator-profile/${creatorProfileId}/`;
        if (!key.startsWith(prefix)) {
            throw new _common.BadRequestException('Invalid profileImageKey');
        }
    }
    assertTempProfileImageKeyOwner(userId, key) {
        if (!this.storage.isTempCreatorProfileImageKeyForUser(userId, key)) {
            throw new _common.BadRequestException('Invalid profileImageKey');
        }
    }
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
    mapCreatorProfileResponseDto(profile) {
        const mapped = this.mapCreatorProfile(profile);
        return {
            id: mapped.id,
            userId: mapped.userId,
            displayName: mapped.displayName,
            profileImageUrl: mapped.profileImageUrl ?? null,
            city: mapped.city ?? null,
            bio: mapped.bio ?? null,
            gender: mapped.gender ?? null,
            travelRadius: mapped.travelRadius ?? null,
            onLocationAvailable: mapped.onLocationAvailable,
            onLocationFee: mapped.onLocationFee && typeof mapped.onLocationFee?.toString === 'function' ? mapped.onLocationFee.toString() : mapped.onLocationFee ? String(mapped.onLocationFee) : null,
            languages: (mapped.languages ?? []).map((l)=>({
                    id: l.id,
                    language: l.language
                })),
            categories: (mapped.categories ?? []).map((c)=>({
                    id: c.id,
                    category: c.category
                })),
            personaTags: (mapped.personaTags ?? []).map((t)=>({
                    id: t.id,
                    tag: t.tag
                })),
            restrictions: (mapped.restrictions ?? []).map((r)=>({
                    id: r.id,
                    restriction: r.restriction
                })),
            packages: (mapped.packages ?? []).map((p)=>({
                    id: p.id,
                    name: p.name,
                    deliverables: p.deliverables,
                    priceAmount: p.priceAmount,
                    deliveryDays: p.deliveryDays
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
    normalizeUniqueStrings(values) {
        if (!values?.length) return [];
        return [
            ...new Set(values.map((v)=>v.trim()).filter(Boolean))
        ];
    }
    async createCreatorProfile(userId, dto) {
        const normalizedLanguages = this.normalizeUniqueStrings(dto.languages);
        const normalizedCategories = this.normalizeUniqueStrings(dto.categories);
        const normalizedPersonaTags = this.normalizeUniqueStrings(dto.personaTags);
        const normalizedRestrictions = this.normalizeUniqueStrings(dto.restrictions);
        const profileImageKey = dto.profileImageKey?.trim();
        if (profileImageKey) {
            this.assertTempProfileImageKeyOwner(userId, profileImageKey);
        }
        const onLocationFee = dto.onLocationFee !== undefined && dto.onLocationFee !== null ? new _client.Prisma.Decimal(dto.onLocationFee) : null;
        const creatorProfileId = await this.prisma.$transaction(async (tx)=>{
            const existing = await tx.creatorProfile.findUnique({
                where: {
                    userId
                }
            });
            if (existing) {
                throw new _common.ConflictException('Creator profile already exists');
            }
            const createData = {
                userId,
                displayName: dto.displayName,
                city: dto.city ?? null,
                bio: dto.bio ?? null,
                gender: dto.gender ?? null,
                travelRadius: dto.travelRadius ?? null,
                onLocationAvailable: dto.onLocationAvailable ?? false,
                onLocationFee
            };
            const creatorProfile = await tx.creatorProfile.create({
                data: createData
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
            if (normalizedCategories.length > 0) {
                ops.push(tx.creatorCategory.createMany({
                    data: normalizedCategories.map((category)=>({
                            creatorId: creatorProfile.id,
                            category
                        })),
                    skipDuplicates: true
                }));
            }
            if (normalizedPersonaTags.length > 0) {
                ops.push(tx.creatorPersonaTag.createMany({
                    data: normalizedPersonaTags.map((tag)=>({
                            creatorId: creatorProfile.id,
                            tag
                        })),
                    skipDuplicates: true
                }));
            }
            if (normalizedRestrictions.length > 0) {
                ops.push(tx.creatorRestriction.createMany({
                    data: normalizedRestrictions.map((restriction)=>({
                            creatorId: creatorProfile.id,
                            restriction
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
        if (profileImageKey) {
            const finalProfileImageKey = await this.storage.finalizeCreatorProfileImageKey({
                tempKey: profileImageKey,
                creatorProfileId,
                deleteTemp: true
            });
            await this.prisma.creatorProfile.update({
                where: {
                    id: creatorProfileId
                },
                data: {
                    profileImageKey: finalProfileImageKey,
                    profileImageUrl: this.storage.buildCdnUrl(finalProfileImageKey)
                }
            });
        }
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
        return this.mapCreatorProfileResponseDto(profile);
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
            items: items.map((p)=>this.mapCreatorProfileResponseDto(p)),
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
        return this.mapCreatorProfileResponseDto(profile);
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
            let nextProfileImageKey = undefined;
            let nextProfileImageUrl = undefined;
            if (dto.profileImageKey !== undefined) {
                const trimmed = dto.profileImageKey?.trim();
                if (trimmed) {
                    this.assertProfileImageKeyOwner(creatorProfileId, trimmed);
                    nextProfileImageKey = trimmed;
                    nextProfileImageUrl = this.storage.buildCdnUrl(trimmed);
                } else {
                    nextProfileImageKey = null;
                    nextProfileImageUrl = null;
                }
            }
            await tx.creatorProfile.update({
                where: {
                    id: creatorProfileId
                },
                data: {
                    displayName: dto.displayName ?? undefined,
                    profileImageKey: nextProfileImageKey,
                    profileImageUrl: nextProfileImageUrl,
                    city: dto.city ?? undefined,
                    bio: dto.bio ?? undefined,
                    gender: dto.gender ?? undefined,
                    travelRadius: dto.travelRadius ?? undefined,
                    onLocationAvailable: dto.onLocationAvailable ?? undefined,
                    onLocationFee: dto.onLocationFee !== undefined ? dto.onLocationFee ? new _client.Prisma.Decimal(dto.onLocationFee) : null : undefined
                }
            });
            if (dto.languages) {
                const normalized = this.normalizeUniqueStrings(dto.languages);
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
            if (dto.categories) {
                const normalized = this.normalizeUniqueStrings(dto.categories);
                await tx.creatorCategory.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                if (normalized.length > 0) {
                    await tx.creatorCategory.createMany({
                        data: normalized.map((category)=>({
                                creatorId: creatorProfileId,
                                category
                            })),
                        skipDuplicates: true
                    });
                }
            }
            if (dto.personaTags) {
                const normalized = this.normalizeUniqueStrings(dto.personaTags);
                await tx.creatorPersonaTag.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                if (normalized.length > 0) {
                    await tx.creatorPersonaTag.createMany({
                        data: normalized.map((tag)=>({
                                creatorId: creatorProfileId,
                                tag
                            })),
                        skipDuplicates: true
                    });
                }
            }
            if (dto.restrictions) {
                const normalized = this.normalizeUniqueStrings(dto.restrictions);
                await tx.creatorRestriction.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                if (normalized.length > 0) {
                    await tx.creatorRestriction.createMany({
                        data: normalized.map((restriction)=>({
                                creatorId: creatorProfileId,
                                restriction
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
            return this.mapCreatorProfileResponseDto(updated);
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
    async listCategorySuggestions() {
        return this.prisma.creatorCategorySuggestion.findMany({
            take: 100,
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true
            }
        });
    }
    async listPersonaTagSuggestions() {
        return this.prisma.creatorPersonaTagSuggestion.findMany({
            take: 100,
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true
            }
        });
    }
    async listRestrictionSuggestions() {
        return this.prisma.creatorRestrictionSuggestion.findMany({
            take: 100,
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true
            }
        });
    }
    constructor(prisma, creatorPackageService, storage){
        this.prisma = prisma;
        this.creatorPackageService = creatorPackageService;
        this.storage = storage;
    }
};
CreatorProfileService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _prismaservice.PrismaService === "undefined" ? Object : _prismaservice.PrismaService,
        typeof _creatorpackageservice.CreatorPackageService === "undefined" ? Object : _creatorpackageservice.CreatorPackageService,
        typeof _storageservice.StorageService === "undefined" ? Object : _storageservice.StorageService
    ])
], CreatorProfileService);

//# sourceMappingURL=creator-profile.service.js.map