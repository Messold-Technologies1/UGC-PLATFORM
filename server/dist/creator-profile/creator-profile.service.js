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
const _creatorlistfiltersutil = require("./creator-list-filters.util");
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
    packages: true,
    addOns: true,
    creatorApproval: true,
    portfolioVideos: {
        where: {
            visibilityStatus: _client.PortfolioVisibilityStatus.PUBLIC
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 1,
        select: {
            id: true,
            creatorId: true,
            videoUrl: true,
            thumbnailUrl: true,
            industryLabel: true,
            tags: {
                select: {
                    tag: true
                }
            },
            createdAt: true
        }
    }
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
        const first = (mapped.portfolioVideos ?? [])[0] ?? null;
        const firstPortfolioVideo = first ? {
            ...first,
            tags: (first.tags ?? []).map((t)=>t.tag).filter(Boolean)
        } : null;
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
            approvalStatus: mapped.creatorApproval?.status,
            rejectionReason: mapped.creatorApproval?.rejectionReason ?? null,
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
                    deliveryDays: p.deliveryDays,
                    maxRevisions: p.maxRevisions ?? 0
                })),
            addOns: (mapped.addOns ?? []).map((a)=>({
                    id: a.id,
                    name: a.name,
                    priceAmount: a.priceAmount && typeof a.priceAmount.toString === 'function' ? a.priceAmount.toString() : a.priceAmount ? String(a.priceAmount) : '0',
                    description: a.description ?? null
                })),
            firstPortfolioVideo
        };
    }
    async isAdminUser(userId) {
        return this.isAdmin(userId, this.prisma);
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
        const creatorProfileId = await this.prisma.$transaction(async (tx)=>{
            const creatorRole = await tx.role.findUnique({
                where: {
                    name: _client.RoleName.CREATOR
                },
                select: {
                    id: true
                }
            });
            if (!creatorRole) {
                throw new _common.NotFoundException('CREATOR role not configured');
            }
            const currentUser = await tx.user.findUnique({
                where: {
                    id: userId
                },
                select: {
                    primaryRoleId: true,
                    brandProfile: {
                        select: {
                            id: true
                        }
                    }
                }
            });
            if (!currentUser) {
                throw new _common.NotFoundException('User not found');
            }
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
                    travelRadius: dto.travelRadius ?? null,
                    onLocationAvailable: dto.onLocationAvailable ?? false,
                    creatorApproval: {
                        create: {}
                    }
                }
            });
            // Independent writes: can be done in parallel once we have creatorProfile.id.
            const ops = [];
            ops.push(tx.userRole.upsert({
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
                update: {}
            }));
            if (!currentUser.primaryRoleId && !currentUser.brandProfile) {
                ops.push(tx.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        primaryRoleId: creatorRole.id
                    }
                }));
            }
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
            if (dto.addOns?.length) {
                ops.push(tx.creatorAddOn.createMany({
                    data: dto.addOns.map((addOn)=>({
                            creatorId: creatorProfile.id,
                            name: addOn.name,
                            priceAmount: new _client.Prisma.Decimal(addOn.priceAmount),
                            description: addOn.description ?? null
                        }))
                }));
            }
            await Promise.all(ops);
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
        const where = (0, _creatorlistfiltersutil.buildListCreatorsWhere)(query, {
            requireApproved: true
        });
        const include = (0, _creatorlistfiltersutil.buildCreatorListRelationsInclude)(query);
        if (process.env.DEBUG_CREATORS_LIST === '1') {
            this.logger.debug(`listCreators query=${JSON.stringify(query)} where=${JSON.stringify(where)}`);
        }
        const [total, items] = await this.prisma.$transaction([
            this.prisma.creatorProfile.count({
                where
            }),
            this.prisma.creatorProfile.findMany({
                where,
                take: limit,
                skip,
                orderBy: {
                    createdAt: 'desc'
                },
                include: include
            })
        ]);
        return {
            items: items.map((p)=>this.mapCreatorProfileResponseDto(p)),
            total,
            page,
            limit
        };
    }
    async getCreatorById(viewerUserId, id) {
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                id
            },
            include: creatorProfileWithRelationsInclude
        });
        if (!profile) {
            throw new _common.NotFoundException('Creator not found');
        }
        const approval = profile.creatorApproval;
        const status = approval?.status;
        const isApproved = status === _client.ApprovalStatus.APPROVED;
        const isOwner = profile.userId === viewerUserId;
        const admin = await this.isAdminUser(viewerUserId);
        if (!isApproved && !isOwner && !admin) {
            throw new _common.NotFoundException('Creator not found');
        }
        return this.mapCreatorProfileResponseDto(profile);
    }
    async listPendingCreatorApprovals(query) {
        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 20, 50);
        const skip = (page - 1) * limit;
        const where = {
            creatorApproval: {
                status: _client.ApprovalStatus.PENDING
            }
        };
        const [total, items] = await this.prisma.$transaction([
            this.prisma.creatorProfile.count({
                where
            }),
            this.prisma.creatorProfile.findMany({
                where,
                take: limit,
                skip,
                orderBy: {
                    createdAt: 'asc'
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
    async approveCreatorProfile(adminUserId, creatorProfileId) {
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                id: creatorProfileId
            },
            select: {
                id: true
            }
        });
        if (!profile) {
            throw new _common.NotFoundException('Creator not found');
        }
        await this.prisma.creatorApproval.upsert({
            where: {
                creatorId: creatorProfileId
            },
            create: {
                creatorId: creatorProfileId,
                status: _client.ApprovalStatus.APPROVED,
                approvedById: adminUserId,
                approvedAt: new Date()
            },
            update: {
                status: _client.ApprovalStatus.APPROVED,
                approvedById: adminUserId,
                approvedAt: new Date(),
                rejectionReason: null
            }
        });
        const updated = await this.prisma.creatorProfile.findUnique({
            where: {
                id: creatorProfileId
            },
            include: creatorProfileWithRelationsInclude
        });
        if (!updated) {
            throw new Error('Creator profile load failed');
        }
        return this.mapCreatorProfileResponseDto(updated);
    }
    async rejectCreatorProfile(adminUserId, creatorProfileId, rejectionReason) {
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                id: creatorProfileId
            },
            select: {
                id: true
            }
        });
        if (!profile) {
            throw new _common.NotFoundException('Creator not found');
        }
        await this.prisma.creatorApproval.upsert({
            where: {
                creatorId: creatorProfileId
            },
            create: {
                creatorId: creatorProfileId,
                status: _client.ApprovalStatus.REJECTED,
                approvedById: adminUserId,
                approvedAt: new Date(),
                rejectionReason: rejectionReason?.trim() || null
            },
            update: {
                status: _client.ApprovalStatus.REJECTED,
                approvedById: adminUserId,
                approvedAt: new Date(),
                rejectionReason: rejectionReason?.trim() || null
            }
        });
        const updated = await this.prisma.creatorProfile.findUnique({
            where: {
                id: creatorProfileId
            },
            include: creatorProfileWithRelationsInclude
        });
        if (!updated) {
            throw new Error('Creator profile load failed');
        }
        return this.mapCreatorProfileResponseDto(updated);
    }
    async getCreatorProfileForCurrentUser(userId) {
        const profile = await this.prisma.creatorProfile.findUnique({
            where: {
                userId
            },
            include: creatorProfileWithRelationsInclude
        });
        if (!profile) {
            throw new _common.NotFoundException('Creator profile not found');
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
                    onLocationAvailable: dto.onLocationAvailable ?? undefined
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
            if (dto.addOns !== undefined) {
                await tx.creatorAddOn.deleteMany({
                    where: {
                        creatorId: creatorProfileId
                    }
                });
                if (dto.addOns.length > 0) {
                    await tx.creatorAddOn.createMany({
                        data: dto.addOns.map((addOn)=>({
                                creatorId: creatorProfileId,
                                name: addOn.name,
                                priceAmount: new _client.Prisma.Decimal(addOn.priceAmount),
                                description: addOn.description ?? null
                            }))
                    });
                }
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
    async addOrUpdateAddOns(actingUserId, creatorProfileId, dto) {
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
            const payload = dto.addOns ?? [];
            if (payload.length > 0) {
                const names = Array.from(new Set(payload.map((a)=>a.name.trim()).filter((name)=>name.length > 0)));
                if (names.length > 0) {
                    await tx.creatorAddOn.deleteMany({
                        where: {
                            creatorId: creatorProfileId,
                            name: {
                                in: names
                            }
                        }
                    });
                    await tx.creatorAddOn.createMany({
                        data: payload.map((addOn)=>({
                                creatorId: creatorProfileId,
                                name: addOn.name.trim(),
                                priceAmount: new _client.Prisma.Decimal(addOn.priceAmount),
                                description: addOn.description ?? null
                            }))
                    });
                }
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
        this.logger = new _common.Logger(CreatorProfileService.name);
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