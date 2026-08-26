import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import crypto from 'crypto';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateWishlistDto } from './dto/create-wishlist.dto';
import type { UpdateWishlistDto } from './dto/update-wishlist.dto';
import type { WishlistDto, WishlistDetailDto } from './dto/wishlist.dto';
import type { WishlistShareResponseDto } from './dto/wishlist-share-response.dto';
import type { PublicWishlistResponseDto } from './dto/public-wishlist-response.dto';
import type { ImportSharedWishlistDto } from './dto/import-shared-wishlist.dto';
import type { ImportSharedWishlistResponseDto } from './dto/import-shared-wishlist-response.dto';
import type { CreatorPublicListItemDto } from '../creator-profile/dto/creator-public-list-item.dto';
import { mapUnavailabilityToPublicAvailability } from '../creator-profile/creator-unavailability.util';
import { PortfolioVisibilityStatus } from '@prisma/client';

const creatorWithRelationsInclude = {
  facetSelections: { include: { option: true } },
  profileLanguages: { include: { option: true } },
  restrictions: true,
  packages: true,
  addOns: true,
  unavailability: { select: { startsOn: true, endsOn: true } },
  portfolioVideos: {
    where: { visibilityStatus: PortfolioVisibilityStatus.PUBLIC },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    select: {
      id: true,
      creatorId: true,
      videoUrl: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  },
  stats: { select: { avgRating: true, reviewCount: true } },
} as const;

function mapCreatorAddOns(addOns: any): Array<{
  id: string;
  name: string;
  priceAmount: string;
  description: string | null;
}> {
  return Array.isArray(addOns)
    ? addOns.map((a: any) => ({
        id: String(a?.id ?? ''),
        name: String(a?.name ?? ''),
        priceAmount:
          a?.priceAmount?.toString?.() ??
          (typeof a?.priceAmount === 'string' ? a.priceAmount : ''),
        description: a?.description ?? null,
      }))
    : [];
}

function mapCreatorToPublicListItem(profile: any): CreatorPublicListItemDto {
  const portfolioVideos = Array.isArray(profile.portfolioVideos)
    ? profile.portfolioVideos.map((v: any) => ({
        id: v.id,
        creatorId: v.creatorId,
        videoUrl: v.videoUrl,
        thumbnailUrl: v.thumbnailUrl ?? null,
        createdAt: v.createdAt,
      }))
    : [];

  const profileLanguages = Array.isArray(profile.profileLanguages)
    ? profile.profileLanguages
        .map((row: any) => ({
          slug: String(row?.option?.slug ?? ''),
          label: String(row?.option?.label ?? ''),
        }))
        .filter((x: any) => x.slug)
    : [];

  const facetSelections = Array.isArray(profile.facetSelections)
    ? profile.facetSelections
        .map((row: any) => ({
          dimension: row?.option?.dimension,
          slug: String(row?.option?.slug ?? ''),
          label: String(row?.option?.label ?? ''),
        }))
        .filter((x: any) => x.slug && x.dimension)
    : [];

  const availability = mapUnavailabilityToPublicAvailability(
    profile.unavailability ?? null,
  );

  return {
    id: profile.id,
    userId: profile.userId,
    // Brands see the opaque public slug, never the creator's real name.
    name: profile.publicSlug,
    introVideoUrl: profile.introVideoUrl ?? null,
    profileImageUrl: profile.profileImageUrl ?? null,
    city: profile.city ?? null,
    countryName: profile.countryName ?? null,
    stateName: profile.stateName ?? null,
    bio: profile.bio ?? null,
    gender: profile.gender ?? null,
    age: null,
    contentVolume: profile.contentVolume ?? null,
    collaborationCount: profile.collaborationCount ?? 0,
    onLocationAvailable: !!profile.onLocationAvailable,
    languages: profileLanguages.map((l: any) => l.label),
    profileLanguages,
    facetSelections,
    restrictions: Array.isArray(profile.restrictions)
      ? profile.restrictions
          .map((r: any) => r?.restriction)
          .filter((v: unknown): v is string => typeof v === 'string')
      : [],
    packages: Array.isArray(profile.packages)
      ? profile.packages.map((pkg: any) => {
          const deliverables = Array.isArray(pkg?.deliverables)
            ? pkg.deliverables
            : [];
          const basicEditing = deliverables.some(
            (d: unknown) => d === 'Basic editing',
          );
          return {
            id: pkg?.id,
            name: String(pkg?.name ?? ''),
            priceAmount:
              pkg?.priceAmount?.toString?.() ??
              (typeof pkg?.priceAmount === 'string' ? pkg.priceAmount : ''),
            deliveryDays:
              typeof pkg?.deliveryDays === 'number' ? pkg.deliveryDays : 0,
            basicEditing,
          };
        })
      : [],
    portfolioVideos,
    avgRating: profile.stats?.avgRating?.toString() ?? null,
    reviewCount: profile.stats?.reviewCount ?? 0,
    totalOrders: 0,
    completedOrders: 0,
    available: availability.available,
    unavailableFrom: availability.startsOn,
    unavailableTo: availability.endsOn,
  };
}

@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  async listWishlists(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<WishlistDto[]> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const rows = await this.prisma.brandWishlist.findMany({
      where: { brandId: brand.id },
      include: {
        _count: { select: { creators: true } },
        creators: { select: { creatorId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((w) => ({
      id: w.id,
      name: w.name,
      creatorCount: w._count.creators,
      creatorIds: w.creators.map((c: any) => c.creatorId),
      shareEnabled: w.shareEnabled,
      shareToken: w.shareToken ?? null,
      sharedAt: w.sharedAt ?? null,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    }));
  }

  async createWishlist(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    dto: CreateWishlistDto;
  }): Promise<{ id: string }> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    try {
      const wishlist = await this.prisma.brandWishlist.create({
        data: {
          brandId: brand.id,
          name: params.dto.name,
          ...(params.dto.creatorIds?.length
            ? {
                creators: {
                  create: params.dto.creatorIds.map((creatorId, idx) => ({
                    creatorId,
                    sortOrder: idx,
                  })),
                },
              }
            : {}),
        },
        select: { id: true },
      });
      return { id: wishlist.id };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('A wishlist with that name already exists');
      }
      throw err;
    }
  }

  async getWishlistDetail(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
  }): Promise<WishlistDetailDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      include: {
        _count: { select: { creators: true } },
        creators: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            creator: {
              include: creatorWithRelationsInclude as any,
            },
          },
        },
      },
    });

    if (!wishlist) throw new NotFoundException('Wishlist not found');
    if (wishlist.brandId !== brand.id)
      throw new ForbiddenException('Not your wishlist');

    const creators = wishlist.creators.map((wc: any) => ({
      ...mapCreatorToPublicListItem(wc.creator),
      addOns: mapCreatorAddOns(wc.creator?.addOns),
      selectedAddOnIds: Array.isArray(wc.selectedAddOnIds)
        ? wc.selectedAddOnIds
        : [],
    }));

    return {
      id: wishlist.id,
      name: wishlist.name,
      creatorCount: wishlist._count.creators,
      creatorIds: wishlist.creators.map(
        (wc: { creatorId: string }) => wc.creatorId,
      ),
      shareEnabled: wishlist.shareEnabled,
      shareToken: wishlist.shareToken ?? null,
      sharedAt: wishlist.sharedAt ?? null,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt,
      creators,
    };
  }

  async updateWishlist(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
    dto: UpdateWishlistDto;
  }): Promise<WishlistDetailDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const existing = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true },
    });
    if (!existing) throw new NotFoundException('Wishlist not found');
    if (existing.brandId !== brand.id)
      throw new ForbiddenException('Not your wishlist');

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.brandWishlist.update({
          where: { id: params.wishlistId },
          data: {
            ...(params.dto.name !== undefined ? { name: params.dto.name } : {}),
          },
        });

        if (params.dto.creatorIds !== undefined) {
          // Preserve each surviving creator's saved add-on selection across the
          // delete-and-recreate replace.
          const existingRows = await tx.brandWishlistCreator.findMany({
            where: { wishlistId: params.wishlistId },
            select: { creatorId: true, selectedAddOnIds: true },
          });
          const selectionByCreator = new Map(
            existingRows.map((r) => [r.creatorId, r.selectedAddOnIds]),
          );

          await tx.brandWishlistCreator.deleteMany({
            where: { wishlistId: params.wishlistId },
          });
          if (params.dto.creatorIds.length > 0) {
            await tx.brandWishlistCreator.createMany({
              data: params.dto.creatorIds.map((creatorId, idx) => ({
                wishlistId: params.wishlistId,
                creatorId,
                sortOrder: idx,
                selectedAddOnIds: selectionByCreator.get(creatorId) ?? [],
              })),
            });
          }
        }
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ConflictException('A wishlist with that name already exists');
      }
      throw err;
    }

    return this.getWishlistDetail({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
      wishlistId: params.wishlistId,
    });
  }

  async deleteWishlist(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
  }): Promise<void> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const existing = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true },
    });
    if (!existing) throw new NotFoundException('Wishlist not found');
    if (existing.brandId !== brand.id)
      throw new ForbiddenException('Not your wishlist');

    await this.prisma.brandWishlist.delete({
      where: { id: params.wishlistId },
    });
  }

  /**
   * Keep only add-on ids that actually belong to the creator, deduped. Invalid
   * or foreign ids are dropped rather than rejected — the selection is a
   * convenience that's re-validated at checkout anyway.
   */
  private async resolveValidAddOnIds(
    creatorId: string,
    addOnIds?: string[],
  ): Promise<string[]> {
    const ids = [...new Set((addOnIds ?? []).filter(Boolean))];
    if (ids.length === 0) return [];
    const rows = await this.prisma.creatorAddOn.findMany({
      where: { id: { in: ids }, creatorId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async addCreator(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
    creatorId: string;
    addOnIds?: string[];
  }): Promise<void> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    if (wishlist.brandId !== brand.id)
      throw new ForbiddenException('Not your wishlist');

    const selectedAddOnIds = await this.resolveValidAddOnIds(
      params.creatorId,
      params.addOnIds,
    );

    await this.prisma.brandWishlistCreator.upsert({
      where: {
        wishlistId_creatorId: {
          wishlistId: params.wishlistId,
          creatorId: params.creatorId,
        },
      },
      create: {
        wishlistId: params.wishlistId,
        creatorId: params.creatorId,
        selectedAddOnIds,
      },
      // Only overwrite the saved selection when the caller supplied add-ons,
      // so re-adding a creator without add-ons doesn't wipe an earlier choice.
      update: params.addOnIds !== undefined ? { selectedAddOnIds } : {},
    });
  }

  async removeCreator(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
    creatorId: string;
  }): Promise<void> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    if (wishlist.brandId !== brand.id)
      throw new ForbiddenException('Not your wishlist');

    await this.prisma.brandWishlistCreator.deleteMany({
      where: { wishlistId: params.wishlistId, creatorId: params.creatorId },
    });
  }

  async toggleShare(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
  }): Promise<WishlistShareResponseDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true, shareEnabled: true, shareToken: true },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    if (wishlist.brandId !== brand.id)
      throw new ForbiddenException('Not your wishlist');

    let updated: {
      shareEnabled: boolean;
      shareToken: string | null;
      sharedAt: Date | null;
    };

    if (!wishlist.shareEnabled) {
      const token =
        wishlist.shareToken ?? crypto.randomUUID().replace(/-/g, '');
      updated = await this.prisma.brandWishlist.update({
        where: { id: params.wishlistId },
        data: {
          shareEnabled: true,
          shareToken: token,
          sharedAt: new Date(),
        },
        select: { shareEnabled: true, shareToken: true, sharedAt: true },
      });
    } else {
      updated = await this.prisma.brandWishlist.update({
        where: { id: params.wishlistId },
        data: { shareEnabled: false },
        select: { shareEnabled: true, shareToken: true, sharedAt: true },
      });
    }

    return {
      shareEnabled: updated.shareEnabled,
      shareToken: updated.shareToken ?? '',
      sharedAt: updated.sharedAt ?? null,
    };
  }

  async getPublicWishlist(params: {
    shareToken: string;
  }): Promise<PublicWishlistResponseDto> {
    const wishlist = await this.prisma.brandWishlist.findFirst({
      where: { shareToken: params.shareToken, shareEnabled: true },
      include: {
        brand: {
          select: { brandName: true, logoUrl: true, contactFullName: true },
        },
        creators: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            creator: {
              include: creatorWithRelationsInclude as any,
            },
          },
        },
      },
    });

    if (!wishlist)
      throw new NotFoundException('Wishlist not found or sharing is disabled');

    const creators = wishlist.creators.map((wc: any) =>
      mapCreatorToPublicListItem(wc.creator),
    );

    return {
      id: wishlist.id,
      brandId: wishlist.brandId,
      name: wishlist.name,
      sharedAt: wishlist.sharedAt ?? null,
      brand: {
        brandName: wishlist.brand.brandName ?? '',
        logoUrl: (wishlist.brand as any).logoUrl ?? null,
        contactFullName: wishlist.brand.contactFullName ?? null,
      },
      creators,
    };
  }

  async importFromShare(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    shareToken: string;
    dto: ImportSharedWishlistDto;
  }): Promise<ImportSharedWishlistResponseDto> {
    const { brand } = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });

    const source = await this.prisma.brandWishlist.findFirst({
      where: { shareToken: params.shareToken, shareEnabled: true },
      include: {
        creators: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: { creatorId: true },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Wishlist not found or sharing is disabled');
    }

    if (source.brandId === brand.id) {
      throw new ConflictException(
        'This shortlist already belongs to your brand',
      );
    }

    const creatorIds = source.creators.map((row) => row.creatorId);
    if (creatorIds.length === 0) {
      throw new BadRequestException('This shortlist has no creators to import');
    }

    const hasWishlistId =
      typeof params.dto.wishlistId === 'string' &&
      params.dto.wishlistId.length > 0;
    const hasName =
      typeof params.dto.name === 'string' && params.dto.name.trim().length > 0;

    if (hasWishlistId === hasName) {
      throw new BadRequestException('Provide either wishlistId or name');
    }

    let targetWishlistId: string;
    let existingCreatorIds = new Set<string>();

    if (hasWishlistId) {
      const target = await this.prisma.brandWishlist.findUnique({
        where: { id: params.dto.wishlistId },
        include: {
          creators: { select: { creatorId: true, sortOrder: true } },
        },
      });
      if (!target) throw new NotFoundException('Wishlist not found');
      if (target.brandId !== brand.id) {
        throw new ForbiddenException('Not your wishlist');
      }
      targetWishlistId = target.id;
      existingCreatorIds = new Set(target.creators.map((row) => row.creatorId));
    } else {
      const name = params.dto.name!.trim();
      try {
        const created = await this.prisma.brandWishlist.create({
          data: {
            brandId: brand.id,
            name,
            creators: {
              create: creatorIds.map((creatorId, idx) => ({
                creatorId,
                sortOrder: idx,
              })),
            },
          },
          select: { id: true },
        });
        return {
          wishlistId: created.id,
          addedCount: creatorIds.length,
          skippedCount: 0,
        };
      } catch (err: any) {
        if (err?.code === 'P2002') {
          throw new ConflictException(
            'A wishlist with that name already exists',
          );
        }
        throw err;
      }
    }

    const toAdd = creatorIds.filter((id) => !existingCreatorIds.has(id));
    const skippedCount = creatorIds.length - toAdd.length;

    if (toAdd.length > 0) {
      const maxSortOrder = await this.prisma.brandWishlistCreator.aggregate({
        where: { wishlistId: targetWishlistId },
        _max: { sortOrder: true },
      });
      const startOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

      await this.prisma.brandWishlistCreator.createMany({
        data: toAdd.map((creatorId, idx) => ({
          wishlistId: targetWishlistId,
          creatorId,
          sortOrder: startOrder + idx,
        })),
        skipDuplicates: true,
      });
    }

    return {
      wishlistId: targetWishlistId,
      addedCount: toAdd.length,
      skippedCount,
    };
  }
}
