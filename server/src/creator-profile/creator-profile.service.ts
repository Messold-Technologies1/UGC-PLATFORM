import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ApprovalStatus,
  PortfolioVisibilityStatus,
  Prisma,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCreatorProfileDto } from './dto/create-creator-profile.dto';
import { CreatorPackageService } from '../creator-package/creator-package.service';
import { ListCreatorsQueryDto } from './dto/list-creators-query.dto';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { StorageService } from '../storage/storage.service';
import { PresignProfileImageUploadDto } from './dto/presign-profile-image-upload.dto';
import { CreatorProfileResponseDto } from './dto/creator-profile-response.dto';
import { CreatorsListResponseDto } from './dto/creators-list-response.dto';
import type { CreatorsPublicListResponseDto } from './dto/creators-public-list-response.dto';
import type {
  CreatorPublicListItemDto,
  CreatorPublicListPortfolioVideoDto,
} from './dto/creator-public-list-item.dto';
import { CreatorSuggestionItemDto } from './dto/creator-suggestion-item.dto';
import { AddCreatorAddOnsDto } from './dto/add-creator-addons.dto';
import {
  buildCreatorListRelationsInclude,
  buildListCreatorsWhere,
} from './creator-list-filters.util';

const creatorProfileWithRelationsInclude = {
  languages: true,
  categories: true,
  personaTags: true,
  restrictions: true,
  packages: true,
  addOns: true,
  creatorApproval: true,
  portfolioVideos: {
    where: { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
    orderBy: { createdAt: 'desc' },
    take: 1,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
      industryLabel: true,
      tags: { select: { tag: true } },
      createdAt: true,
    },
  },
} as const;

/**
 * NOTE: We intentionally keep this payload type loose because the workspace
 * TypeScript server can lag behind Prisma client generation in monorepos.
 * Runtime shape is guaranteed by `creatorProfileWithRelationsInclude`.
 */
type CreatorProfileWithRelations = any;

type CreatorProfileMapped = any;

function mapJsonDeliverables(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/** Client passed to interactive `$transaction` callbacks */
type PrismaTransactionClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class CreatorProfileService {
  private readonly logger = new Logger(CreatorProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly creatorPackageService: CreatorPackageService,
    private readonly storage: StorageService,
  ) {}

  async presignProfileImageUpload(
    userId: string,
    dto: PresignProfileImageUploadDto,
  ) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const key = this.storage.buildObjectKey({
      kind: 'creator_profile_image',
      userId,
      creatorProfileId: profile?.id,
      contentType: dto.contentType,
    });

    return this.storage.createPresignedPutUpload({
      key,
      contentType: dto.contentType,
      contentLength: dto.contentLength,
    });
  }

  private assertProfileImageKeyOwner(
    creatorProfileId: string,
    key: string,
  ): void {
    const prefix = `creator-profile/${creatorProfileId}/`;
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('Invalid profileImageKey');
    }
  }

  private assertTempProfileImageKeyOwner(userId: string, key: string): void {
    if (!this.storage.isTempCreatorProfileImageKeyForUser(userId, key)) {
      throw new BadRequestException('Invalid profileImageKey');
    }
  }

  private mapCreatorProfile(
    profile: CreatorProfileWithRelations,
  ): CreatorProfileMapped {
    const packages = profile.packages ?? [];
    return {
      ...profile,
      packages: packages.map(
        ({
          deliverables,
          priceAmount,
          ...rest
        }): CreatorProfileMapped['packages'][number] => ({
          ...rest,
          deliverables: mapJsonDeliverables(deliverables),
          priceAmount:
            typeof priceAmount?.toString === 'function'
              ? priceAmount.toString()
              : String(priceAmount),
        }),
      ),
    };
  }

  private mapCreatorProfileResponseDto(
    profile: CreatorProfileWithRelations,
  ): CreatorProfileResponseDto {
    const mapped = this.mapCreatorProfile(profile);
    const first = (mapped.portfolioVideos ?? [])[0] ?? null;
    const firstPortfolioVideo = first
      ? {
          ...first,
          tags: (first.tags ?? []).map((t: any) => t.tag).filter(Boolean),
        }
      : null;
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
      languages: (mapped.languages ?? []).map((l) => ({
        id: l.id,
        language: l.language,
      })),
      categories: (mapped.categories ?? []).map((c) => ({
        id: c.id,
        category: c.category,
      })),
      personaTags: (mapped.personaTags ?? []).map((t) => ({
        id: t.id,
        tag: t.tag,
      })),
      restrictions: (mapped.restrictions ?? []).map((r) => ({
        id: r.id,
        restriction: r.restriction,
      })),
      packages: (mapped.packages ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        deliverables: p.deliverables,
        priceAmount: p.priceAmount,
        deliveryDays: p.deliveryDays,
        maxRevisions: p.maxRevisions ?? 0,
      })),
      addOns: (mapped.addOns ?? []).map((a: any) => ({
        id: a.id,
        name: a.name,
        priceAmount:
          a.priceAmount && typeof a.priceAmount.toString === 'function'
            ? a.priceAmount.toString()
            : a.priceAmount
              ? String(a.priceAmount)
              : '0',
        description: a.description ?? null,
      })),
      firstPortfolioVideo,
    };
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    return this.isAdmin(
      userId,
      this.prisma as unknown as PrismaTransactionClient,
    );
  }

  private async isAdmin(
    userId: string,
    tx: PrismaTransactionClient,
  ): Promise<boolean> {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });

    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return (
      user.userRoles?.some((ur) => ur.role?.name === RoleName.ADMIN) ?? false
    );
  }

  private normalizeUniqueStrings(values: string[] | undefined): string[] {
    if (!values?.length) return [];
    return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  }

  async createCreatorProfile(
    userId: string,
    dto: CreateCreatorProfileDto,
  ): Promise<CreatorProfileResponseDto> {
    const normalizedLanguages = this.normalizeUniqueStrings(dto.languages);
    const normalizedCategories = this.normalizeUniqueStrings(dto.categories);
    const normalizedPersonaTags = this.normalizeUniqueStrings(dto.personaTags);
    const normalizedRestrictions = this.normalizeUniqueStrings(
      dto.restrictions,
    );

    const profileImageKey = dto.profileImageKey?.trim();
    if (profileImageKey) {
      this.assertTempProfileImageKeyOwner(userId, profileImageKey);
    }

    const creatorProfileId = await this.prisma.$transaction(
      async (tx) => {
        const creatorRole = await tx.role.findUnique({
          where: { name: RoleName.CREATOR },
          select: { id: true },
        });
        if (!creatorRole) {
          throw new NotFoundException('CREATOR role not configured');
        }

        const currentUser: any = await tx.user.findUnique({
          where: { id: userId },
          select: {
            primaryRoleId: true,
          } as any,
        });
        if (!currentUser) {
          throw new NotFoundException('User not found');
        }

        const existing = await tx.creatorProfile.findUnique({
          where: { userId },
        });
        if (existing) {
          throw new ConflictException('Creator profile already exists');
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
              create: {},
            },
          },
        });

        // Independent writes: can be done in parallel once we have creatorProfile.id.
        const ops: Array<Promise<unknown>> = [];

        ops.push(
          tx.userRole.upsert({
            where: { userId_roleId: { userId, roleId: creatorRole.id } },
            create: { userId, roleId: creatorRole.id },
            update: {},
          }),
        );

        // With URL-based workspace selection, creator profile creation should
        // make CREATOR the primary role if none is set yet.
        if (!currentUser.primaryRoleId) {
          ops.push(
            tx.user.update({
              where: { id: userId },
              data: { primaryRoleId: creatorRole.id } as any,
            }),
          );
        }

        if (normalizedLanguages.length > 0) {
          ops.push(
            tx.creatorLanguage.createMany({
              data: normalizedLanguages.map((language) => ({
                creatorId: creatorProfile.id,
                language,
              })),
              skipDuplicates: true,
            }),
          );
        }

        if (normalizedCategories.length > 0) {
          ops.push(
            (tx as any).creatorCategory.createMany({
              data: normalizedCategories.map((category) => ({
                creatorId: creatorProfile.id,
                category,
              })),
              skipDuplicates: true,
            }),
          );
        }

        if (normalizedPersonaTags.length > 0) {
          ops.push(
            (tx as any).creatorPersonaTag.createMany({
              data: normalizedPersonaTags.map((tag) => ({
                creatorId: creatorProfile.id,
                tag,
              })),
              skipDuplicates: true,
            }),
          );
        }

        if (normalizedRestrictions.length > 0) {
          ops.push(
            (tx as any).creatorRestriction.createMany({
              data: normalizedRestrictions.map((restriction) => ({
                creatorId: creatorProfile.id,
                restriction,
              })),
              skipDuplicates: true,
            }),
          );
        }

        if (dto.packages?.length) {
          ops.push(
            this.creatorPackageService.createPackages(
              tx,
              creatorProfile.id,
              dto.packages,
            ),
          );
        }

        if (dto.addOns?.length) {
          ops.push(
            (tx as any).creatorAddOn.createMany({
              data: dto.addOns.map((addOn) => ({
                creatorId: creatorProfile.id,
                name: addOn.name,
                priceAmount: new Prisma.Decimal(addOn.priceAmount),
                description: addOn.description ?? null,
              })),
            }),
          );
        }

        await Promise.all(ops);

        return creatorProfile.id;
      },
      { timeout: 30_000, maxWait: 10_000 },
    );

    if (profileImageKey) {
      const finalProfileImageKey =
        await this.storage.finalizeCreatorProfileImageKey({
          tempKey: profileImageKey,
          creatorProfileId,
          deleteTemp: true,
        });
      await this.prisma.creatorProfile.update({
        where: { id: creatorProfileId },
        data: {
          profileImageKey: finalProfileImageKey,
          profileImageUrl: this.storage.buildCdnUrl(finalProfileImageKey),
        },
      });
    }

    // Fetch after commit to keep the transaction fast and avoid interactive tx timeouts.
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });

    if (!profile) {
      throw new Error('Creator profile creation failed');
    }

    return this.mapCreatorProfileResponseDto(profile);
  }

  async listCreators(
    query: ListCreatorsQueryDto,
  ): Promise<CreatorsPublicListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = buildListCreatorsWhere(query, { requireApproved: true });
    const include = buildCreatorListRelationsInclude(query);

    if (process.env.DEBUG_CREATORS_LIST === '1') {
      this.logger.debug(
        `listCreators query=${JSON.stringify(query)} where=${JSON.stringify(where)}`,
      );
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: include as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapCreatorPublicListItemDto(p)),
      total,
      page,
      limit,
    };
  }

  private mapCreatorPublicListItemDto(
    profile: any,
  ): CreatorPublicListItemDto {
    const portfolioVideos: CreatorPublicListPortfolioVideoDto[] = Array.isArray(
      profile.portfolioVideos,
    )
      ? profile.portfolioVideos.map((v: any) => ({
          id: v.id,
          creatorId: v.creatorId,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl ?? null,
          industryLabel: v.industryLabel ?? null,
          tags: Array.isArray(v.tags)
            ? v.tags
                .map((t: any) => t?.tag)
                .filter((x: unknown): x is string => typeof x === 'string')
            : [],
          createdAt: v.createdAt,
        }))
      : [];

    return {
      id: profile.id,
      userId: profile.userId,
      name: profile.displayName,
      profileImageUrl: profile.profileImageUrl ?? null,
      city: profile.city ?? null,
      bio: profile.bio ?? null,
      gender: profile.gender ?? null,
      onLocationAvailable: !!profile.onLocationAvailable,
      languages: Array.isArray(profile.languages)
        ? profile.languages
            .map((l: any) => l?.language)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      categories: Array.isArray(profile.categories)
        ? profile.categories
            .map((c: any) => c?.category)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      personaTags: Array.isArray(profile.personaTags)
        ? profile.personaTags
            .map((t: any) => t?.tag)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      restrictions: Array.isArray(profile.restrictions)
        ? profile.restrictions
            .map((r: any) => r?.restriction)
            .filter((v: unknown): v is string => typeof v === 'string')
        : [],
      packages: Array.isArray(profile.packages)
        ? profile.packages.map((pkg: any) => ({
            name: String(pkg?.name ?? ''),
            priceAmount:
              pkg?.priceAmount?.toString?.() ??
              (typeof pkg?.priceAmount === 'string' ? pkg.priceAmount : ''),
          }))
        : [],
      portfolioVideos,
    };
  }

  async getCreatorById(
    viewerUserId: string,
    id: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id },
      include: creatorProfileWithRelationsInclude as any,
    });

    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    const approval = (
      profile as typeof profile & {
        creatorApproval?: { status: ApprovalStatus } | null;
      }
    ).creatorApproval;
    const status = approval?.status;
    const isApproved = status === ApprovalStatus.APPROVED;
    const isOwner = profile.userId === viewerUserId;
    const admin = await this.isAdminUser(viewerUserId);

    if (!isApproved && !isOwner && !admin) {
      throw new NotFoundException('Creator not found');
    }

    return this.mapCreatorProfileResponseDto(profile);
  }

  async listPendingCreatorApprovals(query: {
    page?: number;
    limit?: number;
  }): Promise<CreatorsListResponseDto> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Prisma.CreatorProfileWhereInput = {
      creatorApproval: { status: ApprovalStatus.PENDING },
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.creatorProfile.count({ where }),
      this.prisma.creatorProfile.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'asc' },
        include: creatorProfileWithRelationsInclude as any,
      }),
    ]);

    return {
      items: items.map((p) => this.mapCreatorProfileResponseDto(p)),
      total,
      page,
      limit,
    };
  }

  async approveCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    await this.prisma.creatorApproval.upsert({
      where: { creatorId: creatorProfileId },
      create: {
        creatorId: creatorProfileId,
        status: ApprovalStatus.APPROVED,
        approvedById: adminUserId,
        approvedAt: new Date(),
      },
      update: {
        status: ApprovalStatus.APPROVED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }
    return this.mapCreatorProfileResponseDto(updated);
  }

  async rejectCreatorProfile(
    adminUserId: string,
    creatorProfileId: string,
    rejectionReason?: string | null,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Creator not found');
    }

    await this.prisma.creatorApproval.upsert({
      where: { creatorId: creatorProfileId },
      create: {
        creatorId: creatorProfileId,
        status: ApprovalStatus.REJECTED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
      update: {
        status: ApprovalStatus.REJECTED,
        approvedById: adminUserId,
        approvedAt: new Date(),
        rejectionReason: rejectionReason?.trim() || null,
      },
    });

    const updated = await this.prisma.creatorProfile.findUnique({
      where: { id: creatorProfileId },
      include: creatorProfileWithRelationsInclude as any,
    });
    if (!updated) {
      throw new Error('Creator profile load failed');
    }
    return this.mapCreatorProfileResponseDto(updated);
  }

  async getCreatorProfileForCurrentUser(
    userId: string,
  ): Promise<CreatorProfileResponseDto> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      include: creatorProfileWithRelationsInclude as any,
    });

    if (!profile) {
      throw new NotFoundException('Creator profile not found');
    }

    return this.mapCreatorProfileResponseDto(profile);
  }

  async updateCreatorProfile(
    actingUserId: string,
    creatorProfileId: string,
    dto: UpdateCreatorProfileDto,
  ): Promise<CreatorProfileResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });

        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to update this creator profile',
          );
        }

        let nextProfileImageKey: string | null | undefined = undefined;
        let nextProfileImageUrl: string | null | undefined = undefined;
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
          where: { id: creatorProfileId },
          data: {
            displayName: dto.displayName ?? undefined,
            profileImageKey: nextProfileImageKey,
            profileImageUrl: nextProfileImageUrl,
            city: dto.city ?? undefined,
            bio: dto.bio ?? undefined,
            gender: dto.gender ?? undefined,
            travelRadius: dto.travelRadius ?? undefined,
            onLocationAvailable: dto.onLocationAvailable ?? undefined,
          } as any,
        });

        if (dto.languages) {
          const normalized = this.normalizeUniqueStrings(dto.languages);
          await tx.creatorLanguage.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await tx.creatorLanguage.createMany({
              data: normalized.map((language) => ({
                creatorId: creatorProfileId,
                language,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.categories) {
          const normalized = this.normalizeUniqueStrings(dto.categories);
          await (tx as any).creatorCategory.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await (tx as any).creatorCategory.createMany({
              data: normalized.map((category) => ({
                creatorId: creatorProfileId,
                category,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.personaTags) {
          const normalized = this.normalizeUniqueStrings(dto.personaTags);
          await (tx as any).creatorPersonaTag.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await (tx as any).creatorPersonaTag.createMany({
              data: normalized.map((tag) => ({
                creatorId: creatorProfileId,
                tag,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.restrictions) {
          const normalized = this.normalizeUniqueStrings(dto.restrictions);
          await (tx as any).creatorRestriction.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (normalized.length > 0) {
            await (tx as any).creatorRestriction.createMany({
              data: normalized.map((restriction) => ({
                creatorId: creatorProfileId,
                restriction,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (dto.packages) {
          await tx.creatorPackage.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          await this.creatorPackageService.createPackages(
            tx,
            creatorProfileId,
            dto.packages,
          );
        }

        if (dto.addOns !== undefined) {
          await tx.creatorAddOn.deleteMany({
            where: { creatorId: creatorProfileId },
          });
          if (dto.addOns.length > 0) {
            await tx.creatorAddOn.createMany({
              data: dto.addOns.map((addOn) => ({
                creatorId: creatorProfileId,
                name: addOn.name,
                priceAmount: new Prisma.Decimal(addOn.priceAmount),
                description: addOn.description ?? null,
              })),
            });
          }
        }

        const updated = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: creatorProfileWithRelationsInclude as any,
        });

        if (!updated) {
          throw new Error('Creator profile update failed');
        }

        return this.mapCreatorProfileResponseDto(updated);
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async addOrUpdateAddOns(
    actingUserId: string,
    creatorProfileId: string,
    dto: AddCreatorAddOnsDto,
  ): Promise<CreatorProfileResponseDto> {
    return this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });

        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to update this creator profile',
          );
        }

        const payload = dto.addOns ?? [];
        if (payload.length > 0) {
          const names = Array.from(
            new Set(
              payload
                .map((a) => a.name.trim())
                .filter((name) => name.length > 0),
            ),
          );

          if (names.length > 0) {
            await (tx as any).creatorAddOn.deleteMany({
              where: {
                creatorId: creatorProfileId,
                name: { in: names },
              },
            });

            await (tx as any).creatorAddOn.createMany({
              data: payload.map((addOn) => ({
                creatorId: creatorProfileId,
                name: addOn.name.trim(),
                priceAmount: new Prisma.Decimal(addOn.priceAmount),
                description: addOn.description ?? null,
              })),
            });
          }
        }

        const updated = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
          include: creatorProfileWithRelationsInclude as any,
        });

        if (!updated) {
          throw new Error('Creator profile update failed');
        }

        return this.mapCreatorProfileResponseDto(updated);
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async deleteCreatorProfile(actingUserId: string, creatorProfileId: string) {
    await this.prisma.$transaction(
      async (tx) => {
        const profile = await tx.creatorProfile.findUnique({
          where: { id: creatorProfileId },
        });
        if (!profile) {
          throw new NotFoundException('Creator not found');
        }

        const allowed =
          profile.userId === actingUserId ||
          (await this.isAdmin(actingUserId, tx));
        if (!allowed) {
          throw new ForbiddenException(
            'Not allowed to delete this creator profile',
          );
        }

        await tx.creatorProfile.delete({ where: { id: creatorProfileId } });
      },
      { timeout: 30_000, maxWait: 10_000 },
    );
  }

  async listCategorySuggestions(): Promise<CreatorSuggestionItemDto[]> {
    const suggestions = (await (
      this.prisma as any
    ).creatorCategorySuggestion.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })) as CreatorSuggestionItemDto[];

    return suggestions;
  }

  async listPersonaTagSuggestions(): Promise<CreatorSuggestionItemDto[]> {
    const suggestions = (await (
      this.prisma as any
    ).creatorPersonaTagSuggestion.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })) as CreatorSuggestionItemDto[];

    return suggestions;
  }

  async listRestrictionSuggestions(): Promise<CreatorSuggestionItemDto[]> {
    const suggestions = (await (
      this.prisma as any
    ).creatorRestrictionSuggestion.findMany({
      take: 100,
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    })) as CreatorSuggestionItemDto[];

    return suggestions;
  }
}
