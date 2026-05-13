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
const _creatorageutil = require("./creator-age.util");
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
    user: {
        select: {
            phone: true,
            phoneVerified: true
        }
    },
    facetSelections: {
        include: {
            option: true
        }
    },
    profileLanguages: {
        include: {
            option: true
        }
    },
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
        const dob = mapped.dateOfBirth ? new Date(mapped.dateOfBirth) : null;
        const age = dob && !Number.isNaN(dob.getTime()) ? (0, _creatorageutil.computeAgeYears)(dob) : null;
        const ageGroup = dob && !Number.isNaN(dob.getTime()) ? (0, _creatorageutil.computeAgeGroup)(dob) : null;
        const dobStr = dob && !Number.isNaN(dob.getTime()) ? dob.toISOString().slice(0, 10) : null;
        return {
            id: mapped.id,
            userId: mapped.userId,
            displayName: mapped.displayName,
            phone: mapped.user?.phone ?? null,
            phoneVerified: mapped.user?.phoneVerified ?? false,
            profileImageUrl: mapped.profileImageUrl ?? null,
            countryName: mapped.countryName ?? null,
            stateName: mapped.stateName ?? null,
            city: mapped.city ?? null,
            bio: mapped.bio ?? null,
            gender: mapped.gender ?? null,
            dateOfBirth: dobStr,
            age,
            ageGroup,
            shippingAddress: mapped.shippingAddress ?? null,
            instagramUrl: mapped.instagramUrl ?? null,
            contentVolume: mapped.contentVolume ?? null,
            collaborationCount: mapped.collaborationCount ?? 0,
            travelRadius: mapped.travelRadius ?? null,
            onLocationAvailable: mapped.onLocationAvailable,
            approvalStatus: mapped.creatorApproval?.status,
            rejectionReason: mapped.creatorApproval?.rejectionReason ?? null,
            profileLanguages: (mapped.profileLanguages ?? []).map((row)=>({
                    id: row.id,
                    slug: row.option?.slug ?? '',
                    label: row.option?.label ?? '',
                    fluency: row.fluency
                })),
            facetSelections: (mapped.facetSelections ?? []).map((row)=>({
                    id: row.id,
                    dimension: row.option?.dimension,
                    slug: row.option?.slug ?? '',
                    label: row.option?.label ?? ''
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
                    videoLengthSeconds: p.videoLengthSeconds ?? 60,
                    priceAmount: p.priceAmount,
                    deliveryDays: p.deliveryDays,
                    maxRevisions: p.maxRevisions ?? 1
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
    /** Strip direct contact fields from brands and other non-admin viewers (keys omitted from JSON). */ redactCreatorContactForViewer(dto) {
        const { phone: _phone, phoneVerified: _phoneVerified, instagramUrl: _instagramUrl, ...rest } = dto;
        return rest;
    }
    async normalizeCreatorAddOns(tx, addOns) {
        const options = await tx.creatorAddOnOption.findMany({
            select: {
                slug: true,
                name: true,
                fixedPrice: true,
                minPrice: true,
                stepPrice: true
            }
        });
        const bySlug = new Map(options.map((o)=>[
                o.slug,
                o
            ]));
        return addOns.map((a)=>{
            const slug = String(a.slug ?? '').trim();
            const rule = bySlug.get(slug);
            if (rule == null) {
                throw new _common.BadRequestException('Invalid add-on.');
            }
            const n = Number(a.priceAmount);
            if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
                throw new _common.BadRequestException('Add-on priceAmount must be a whole number.');
            }
            if (rule.fixedPrice != null) {
                if (n !== rule.fixedPrice) {
                    throw new _common.BadRequestException(`"${rule.name}" price must be exactly ${rule.fixedPrice}.`);
                }
            } else {
                const min = rule.minPrice ?? 0;
                const step = rule.stepPrice ?? 1;
                if (n < min || n % step !== 0) {
                    throw new _common.BadRequestException(`"${rule.name}" price must be >= ${min} and in steps of ${step}.`);
                }
            }
            return {
                name: rule.name,
                priceAmount: new _client.Prisma.Decimal(String(n)),
                description: a.description ?? null
            };
        });
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
    async assertPhoneVerifiedForCreator(userId) {
        const u = await this.prisma.user.findUnique({
            where: {
                id: userId
            },
            select: {
                phoneVerified: true,
                phone: true
            }
        });
        if (!u?.phoneVerified || !u?.phone?.trim()) {
            throw new _common.BadRequestException('Verify your mobile number before managing a creator profile.');
        }
    }
    async syncUserDisplayName(tx, userId, displayName) {
        const trimmed = displayName.trim();
        if (!trimmed) return;
        await tx.user.update({
            where: {
                id: userId
            },
            data: {
                name: trimmed
            }
        });
    }
    /**
   * Persists phone on User. If the E.164 value differs from the stored number,
   * clears verification and OTP attempt metadata so the new number must be verified.
   */ async syncUserPhoneIfChanged(tx, userId, phone) {
        const trimmed = phone.trim();
        const current = await tx.user.findUnique({
            where: {
                id: userId
            },
            select: {
                phone: true
            }
        });
        const prev = current?.phone?.trim() ?? '';
        if (prev === trimmed) {
            return;
        }
        await tx.user.update({
            where: {
                id: userId
            },
            data: {
                phone: trimmed,
                phoneVerified: false,
                phoneOtpFailedAttempts: 0,
                phoneOtpLastAttemptAt: null,
                phoneOtpLastStatus: null,
                phoneOtpLastPhone: null
            }
        });
    }
    async resolveFacetOptionIds(tx, selections) {
        if (!selections.length) return [];
        const seen = new Set();
        const ids = [];
        for (const s of selections){
            if (s.dimension === _client.CreatorFacetDimension.LANGUAGE) {
                throw new _common.BadRequestException('Use profileLanguages for LANGUAGE options, not facetSelections.');
            }
            const key = `${s.dimension}:${s.slug}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const opt = await tx.creatorFacetOption.findUnique({
                where: {
                    dimension_slug: {
                        dimension: s.dimension,
                        slug: s.slug
                    }
                }
            });
            if (!opt) {
                throw new _common.BadRequestException(`Unknown facet option ${s.dimension} / ${s.slug}`);
            }
            ids.push(opt.id);
        }
        return ids;
    }
    async resolveLanguageRows(tx, inputs) {
        const out = [];
        const seen = new Set();
        for (const row of inputs){
            if (seen.has(row.slug)) continue;
            seen.add(row.slug);
            const opt = await tx.creatorFacetOption.findUnique({
                where: {
                    dimension_slug: {
                        dimension: _client.CreatorFacetDimension.LANGUAGE,
                        slug: row.slug
                    }
                }
            });
            if (!opt) {
                throw new _common.BadRequestException(`Unknown language slug: ${row.slug}`);
            }
            out.push({
                optionId: opt.id,
                fluency: row.fluency
            });
        }
        return out;
    }
    async replaceFacetSelections(tx, creatorProfileId, optionIds) {
        await tx.creatorProfileFacetSelection.deleteMany({
            where: {
                creatorProfileId
            }
        });
        if (optionIds.length === 0) return;
        await tx.creatorProfileFacetSelection.createMany({
            data: optionIds.map((optionId)=>({
                    creatorProfileId,
                    optionId
                })),
            skipDuplicates: true
        });
    }
    async replaceProfileLanguages(tx, creatorProfileId, rows) {
        await tx.creatorProfileLanguage.deleteMany({
            where: {
                creatorProfileId
            }
        });
        if (rows.length === 0) return;
        await tx.creatorProfileLanguage.createMany({
            data: rows.map((r)=>({
                    creatorProfileId,
                    optionId: r.optionId,
                    fluency: r.fluency
                })),
            skipDuplicates: true
        });
    }
    async listFacetOptions() {
        const options = await this.prisma.creatorFacetOption.findMany({
            orderBy: [
                {
                    dimension: 'asc'
                },
                {
                    sortOrder: 'asc'
                }
            ]
        });
        const optionsByDimension = options.reduce((acc, o)=>{
            (acc[o.dimension] ??= []).push({
                slug: o.slug,
                label: o.label,
                sortOrder: o.sortOrder
            });
            return acc;
        }, {});
        return {
            optionsByDimension
        };
    }
    async listCreatorLanguageOptions() {
        const options = await this.prisma.creatorFacetOption.findMany({
            where: {
                dimension: _client.CreatorFacetDimension.LANGUAGE
            },
            orderBy: {
                sortOrder: 'asc'
            },
            select: {
                slug: true,
                label: true,
                sortOrder: true
            }
        });
        return {
            languages: options.map((o)=>({
                    slug: o.slug,
                    label: o.label,
                    sortOrder: o.sortOrder
                }))
        };
    }
    async listAddOnOptions() {
        const options = await this.prisma.creatorAddOnOption.findMany({
            orderBy: [
                {
                    sortOrder: 'asc'
                },
                {
                    name: 'asc'
                }
            ],
            select: {
                slug: true,
                name: true,
                sortOrder: true,
                fixedPrice: true,
                minPrice: true,
                stepPrice: true
            }
        });
        return {
            options
        };
    }
    async createCreatorProfile(userId, dto) {
        await this.assertPhoneVerifiedForCreator(userId);
        const profileImageKey = dto.profileImageKey?.trim();
        if (profileImageKey) {
            this.assertTempProfileImageKeyOwner(userId, profileImageKey);
        }
        const facetInputs = dto.facetSelections ?? [];
        const langInputs = dto.profileLanguages ?? [];
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
                    primaryRoleId: true
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
            await this.syncUserDisplayName(tx, userId, dto.displayName);
            const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined;
            const facetIds = await this.resolveFacetOptionIds(tx, facetInputs);
            const langRows = await this.resolveLanguageRows(tx, langInputs);
            const creatorProfile = await tx.creatorProfile.create({
                data: {
                    userId,
                    displayName: dto.displayName.trim(),
                    city: dto.city?.trim() || null,
                    countryName: dto.countryName?.trim() || null,
                    stateName: dto.stateName?.trim() || null,
                    bio: dto.bio?.trim() || null,
                    gender: dto.gender ?? null,
                    dateOfBirth: dateOfBirth && !Number.isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
                    shippingAddress: dto.shippingAddress?.trim() || null,
                    instagramUrl: dto.instagramUrl?.trim() || null,
                    contentVolume: dto.contentVolume ?? null,
                    collaborationCount: dto.collaborationCount ?? 0,
                    travelRadius: dto.travelRadius ?? null,
                    onLocationAvailable: dto.onLocationAvailable ?? false,
                    creatorApproval: {
                        create: {}
                    }
                }
            });
            await this.replaceFacetSelections(tx, creatorProfile.id, facetIds);
            await this.replaceProfileLanguages(tx, creatorProfile.id, langRows);
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
            if (!currentUser.primaryRoleId) {
                ops.push(tx.user.update({
                    where: {
                        id: userId
                    },
                    data: {
                        primaryRoleId: creatorRole.id
                    }
                }));
            }
            if (dto.packages?.length) {
                ops.push(this.creatorPackageService.createPackages(tx, creatorProfile.id, dto.packages));
            }
            if (dto.addOns?.length) {
                ops.push((async ()=>{
                    const normalizedAddOns = await this.normalizeCreatorAddOns(tx, dto.addOns);
                    await tx.creatorAddOn.createMany({
                        data: normalizedAddOns.map((addOn)=>({
                                creatorId: creatorProfile.id,
                                name: addOn.name,
                                priceAmount: addOn.priceAmount,
                                description: addOn.description
                            }))
                    });
                })());
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
        const limit = query.limit ?? 4;
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
            items: items.map((p)=>this.mapCreatorPublicListItemDto(p)),
            total,
            page,
            limit
        };
    }
    mapCreatorPublicListItemDto(profile) {
        const portfolioVideos = Array.isArray(profile.portfolioVideos) ? profile.portfolioVideos.map((v)=>({
                id: v.id,
                creatorId: v.creatorId,
                videoUrl: v.videoUrl,
                thumbnailUrl: v.thumbnailUrl ?? null,
                industryLabel: v.industryLabel ?? null,
                tags: Array.isArray(v.tags) ? v.tags.map((t)=>t?.tag).filter((x)=>typeof x === 'string') : [],
                createdAt: v.createdAt
            })) : [];
        const dob = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
        const age = dob && !Number.isNaN(dob.getTime()) ? (0, _creatorageutil.computeAgeYears)(dob) : null;
        const profileLanguages = Array.isArray(profile.profileLanguages) ? profile.profileLanguages.map((row)=>({
                slug: String(row?.option?.slug ?? ''),
                label: String(row?.option?.label ?? ''),
                fluency: row.fluency
            })).filter((x)=>x.slug) : [];
        const facetSelections = Array.isArray(profile.facetSelections) ? profile.facetSelections.map((row)=>({
                dimension: row?.option?.dimension,
                slug: String(row?.option?.slug ?? ''),
                label: String(row?.option?.label ?? '')
            })).filter((x)=>x.slug && x.dimension) : [];
        return {
            id: profile.id,
            userId: profile.userId,
            name: profile.displayName,
            profileImageUrl: profile.profileImageUrl ?? null,
            city: profile.city ?? null,
            countryName: profile.countryName ?? null,
            stateName: profile.stateName ?? null,
            bio: profile.bio ?? null,
            gender: profile.gender ?? null,
            age,
            contentVolume: profile.contentVolume ?? null,
            collaborationCount: profile.collaborationCount ?? 0,
            onLocationAvailable: !!profile.onLocationAvailable,
            languages: profileLanguages.map((l)=>l.label),
            profileLanguages,
            facetSelections,
            categories: Array.isArray(profile.categories) ? profile.categories.map((c)=>c?.category).filter((v)=>typeof v === 'string') : [],
            personaTags: Array.isArray(profile.personaTags) ? profile.personaTags.map((t)=>t?.tag).filter((v)=>typeof v === 'string') : [],
            restrictions: Array.isArray(profile.restrictions) ? profile.restrictions.map((r)=>r?.restriction).filter((v)=>typeof v === 'string') : [],
            packages: Array.isArray(profile.packages) ? profile.packages.map((pkg)=>{
                const deliverables = Array.isArray(pkg?.deliverables) ? pkg.deliverables : [];
                const basicEditing = deliverables.some((d)=>d === 'Basic editing');
                return {
                    name: String(pkg?.name ?? ''),
                    priceAmount: pkg?.priceAmount?.toString?.() ?? (typeof pkg?.priceAmount === 'string' ? pkg.priceAmount : ''),
                    deliveryDays: typeof pkg?.deliveryDays === 'number' ? pkg.deliveryDays : 0,
                    basicEditing: basicEditing
                };
            }) : [],
            portfolioVideos
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
        const dto = this.mapCreatorProfileResponseDto(profile);
        if (isOwner || admin) {
            return dto;
        }
        return this.redactCreatorContactForViewer(dto);
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
        const profileForGate = await this.prisma.creatorProfile.findUnique({
            where: {
                id: creatorProfileId
            },
            select: {
                userId: true
            }
        });
        if (profileForGate?.userId === actingUserId) {
            await this.assertPhoneVerifiedForCreator(actingUserId);
        }
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
            if (dto.displayName !== undefined) {
                await this.syncUserDisplayName(tx, profile.userId, dto.displayName);
            }
            if (dto.phone !== undefined) {
                await this.syncUserPhoneIfChanged(tx, profile.userId, dto.phone);
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
            const data = {};
            if (dto.displayName !== undefined) {
                data.displayName = dto.displayName.trim();
            }
            if (dto.city !== undefined) {
                data.city = dto.city?.trim() || null;
            }
            if (dto.countryName !== undefined) {
                data.countryName = dto.countryName?.trim() || null;
            }
            if (dto.stateName !== undefined) {
                data.stateName = dto.stateName?.trim() || null;
            }
            if (dto.bio !== undefined) {
                data.bio = dto.bio?.trim() || null;
            }
            if (dto.gender !== undefined) {
                data.gender = dto.gender;
            }
            if (dto.dateOfBirth !== undefined) {
                if (!dto.dateOfBirth) {
                    data.dateOfBirth = null;
                } else {
                    const d = new Date(dto.dateOfBirth);
                    data.dateOfBirth = Number.isNaN(d.getTime()) ? null : d;
                }
            }
            if (dto.shippingAddress !== undefined) {
                data.shippingAddress = dto.shippingAddress?.trim() || null;
            }
            if (dto.instagramUrl !== undefined) {
                data.instagramUrl = dto.instagramUrl?.trim() || null;
            }
            if (dto.contentVolume !== undefined) {
                data.contentVolume = dto.contentVolume;
            }
            if (dto.collaborationCount !== undefined) {
                data.collaborationCount = dto.collaborationCount;
            }
            if (dto.travelRadius !== undefined) {
                data.travelRadius = dto.travelRadius;
            }
            if (dto.onLocationAvailable !== undefined) {
                data.onLocationAvailable = dto.onLocationAvailable;
            }
            if (nextProfileImageKey !== undefined) {
                data.profileImageKey = nextProfileImageKey;
                data.profileImageUrl = nextProfileImageUrl;
            }
            if (Object.keys(data).length > 0) {
                await tx.creatorProfile.update({
                    where: {
                        id: creatorProfileId
                    },
                    data
                });
            }
            if (dto.facetSelections !== undefined) {
                const facetIds = await this.resolveFacetOptionIds(tx, dto.facetSelections);
                await this.replaceFacetSelections(tx, creatorProfileId, facetIds);
            }
            if (dto.profileLanguages !== undefined) {
                const langRows = await this.resolveLanguageRows(tx, dto.profileLanguages);
                await this.replaceProfileLanguages(tx, creatorProfileId, langRows);
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
                    const normalizedAddOns = await this.normalizeCreatorAddOns(tx, dto.addOns);
                    await tx.creatorAddOn.createMany({
                        data: normalizedAddOns.map((addOn)=>({
                                creatorId: creatorProfileId,
                                name: addOn.name,
                                priceAmount: addOn.priceAmount,
                                description: addOn.description
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
            // Slug-based update replaces all current add-ons in one go to avoid
            // name-matching issues and keep logic simple.
            await tx.creatorAddOn.deleteMany({
                where: {
                    creatorId: creatorProfileId
                }
            });
            if (payload.length > 0) {
                const normalizedAddOns = await this.normalizeCreatorAddOns(tx, payload);
                await tx.creatorAddOn.createMany({
                    data: normalizedAddOns.map((addOn)=>({
                            creatorId: creatorProfileId,
                            name: addOn.name,
                            priceAmount: addOn.priceAmount,
                            description: addOn.description
                        }))
                });
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
        const suggestions = await this.prisma.creatorCategorySuggestion.findMany({
            take: 100,
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true
            }
        });
        return suggestions;
    }
    async listPersonaTagSuggestions() {
        const suggestions = await this.prisma.creatorPersonaTagSuggestion.findMany({
            take: 100,
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true
            }
        });
        return suggestions;
    }
    async listRestrictionSuggestions() {
        const suggestions = await this.prisma.creatorRestrictionSuggestion.findMany({
            take: 100,
            orderBy: {
                name: 'asc'
            },
            select: {
                id: true,
                name: true
            }
        });
        return suggestions;
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