import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import crypto from 'crypto';
import {
  BrandAccessService,
  type ResolvedOrderActor,
} from '../brand-access/brand-access.service';
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
import { playableAssetWhere } from '../creator-portfolio/portfolio-video-asset.util';

const creatorWithRelationsInclude = {
  facetSelections: { include: { option: true } },
  profileLanguages: { include: { option: true } },
  restrictions: true,
  packages: true,
  addOns: true,
  unavailability: { select: { startsOn: true, endsOn: true } },
  portfolioVideos: {
    where: {
      visibilityStatus: PortfolioVisibilityStatus.PUBLIC,
      ...playableAssetWhere(),
    },
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

function mapCreatorToPublicListItem(
  profile: any,
  eligibleFreeCreatorIds?: Set<string>,
): CreatorPublicListItemDto {
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
    firstOrderFree: !!profile.firstOrderFreeEnabled,
    firstOrderFreeEligible: eligibleFreeCreatorIds
      ? eligibleFreeCreatorIds.has(profile.id)
      : undefined,
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

type WishlistOwnerRow = {
  brandId: string | null;
  agencyId: string | null;
};

@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
  ) {}

  private async resolveOwner(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<ResolvedOrderActor> {
    return this.brandAccess.resolveOrderActor({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId,
    });
  }

  private assertOwnsWishlist(
    wishlist: WishlistOwnerRow,
    actor: ResolvedOrderActor,
  ): void {
    if (actor.brandId && wishlist.brandId === actor.brandId) return;
    if (actor.agencyId && wishlist.agencyId === actor.agencyId) return;
    throw new ForbiddenException('Not your wishlist');
  }

  /**
   * Among the given creators, which are "first order free" AND this buyer has
   * not yet placed an order with (any order that reached paidAt consumes the
   * promo). Drives the per-buyer card badge / ₹0 checkout in the wishlist.
   */
  private async firstOrderFreeEligibleForOwner(
    owner: { brandId?: string; agencyId?: string },
    creatorIds: string[],
  ): Promise<Set<string>> {
    const ids = [...new Set(creatorIds.filter(Boolean))];
    if (ids.length === 0) return new Set();
    const enabled = await this.prisma.creatorProfile.findMany({
      where: { id: { in: ids }, firstOrderFreeEnabled: true },
      select: { id: true },
    });
    const enabledIds = enabled.map((c) => c.id);
    if (enabledIds.length === 0) return new Set();
    const priorOrders = await this.prisma.order.findMany({
      where: {
        ...owner,
        creatorId: { in: enabledIds },
        paidAt: { not: null },
      },
      select: { creatorId: true },
      distinct: ['creatorId'],
    });
    const usedIds = new Set(priorOrders.map((o) => o.creatorId));
    return new Set(enabledIds.filter((id) => !usedIds.has(id)));
  }

  private toWishlistDto(w: {
    id: string;
    name: string;
    shareEnabled: boolean;
    shareToken: string | null;
    sharedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count: { creators: number };
    creators: Array<{ creatorId: string }>;
  }): WishlistDto {
    return {
      id: w.id,
      name: w.name,
      creatorCount: w._count.creators,
      creatorIds: w.creators.map((c) => c.creatorId),
      shareEnabled: w.shareEnabled,
      shareToken: w.shareToken ?? null,
      sharedAt: w.sharedAt ?? null,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }

  async listWishlists(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<WishlistDto[]> {
    const actor = await this.resolveOwner(params);

    const rows = await this.prisma.brandWishlist.findMany({
      where: this.brandAccess.orderOwnerWhere(actor),
      include: {
        _count: { select: { creators: true } },
        creators: { select: { creatorId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((w) => this.toWishlistDto(w));
  }

  async createWishlist(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    dto: CreateWishlistDto;
  }): Promise<{ id: string }> {
    const actor = await this.resolveOwner(params);
    const owner = this.brandAccess.orderOwnerCreateData(actor);

    try {
      const wishlist = await this.prisma.brandWishlist.create({
        data: {
          ...owner,
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
    const actor = await this.resolveOwner(params);

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
    this.assertOwnsWishlist(wishlist, actor);

    const eligibleFreeCreatorIds = await this.firstOrderFreeEligibleForOwner(
      this.brandAccess.orderOwnerWhere(actor),
      wishlist.creators.map((wc: { creatorId: string }) => wc.creatorId),
    );

    const creators = wishlist.creators.map((wc: any) => ({
      ...mapCreatorToPublicListItem(wc.creator, eligibleFreeCreatorIds),
      addOns: mapCreatorAddOns(wc.creator?.addOns),
      selectedAddOnIds: Array.isArray(wc.selectedAddOnIds)
        ? wc.selectedAddOnIds
        : [],
    }));

    return {
      ...this.toWishlistDto(wishlist),
      creators,
    };
  }

  async updateWishlist(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
    dto: UpdateWishlistDto;
  }): Promise<WishlistDetailDto> {
    const actor = await this.resolveOwner(params);

    const existing = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true, agencyId: true },
    });
    if (!existing) throw new NotFoundException('Wishlist not found');
    this.assertOwnsWishlist(existing, actor);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.brandWishlist.update({
          where: { id: params.wishlistId },
          data: {
            ...(params.dto.name !== undefined ? { name: params.dto.name } : {}),
          },
        });

        if (params.dto.creatorIds !== undefined) {
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
    const actor = await this.resolveOwner(params);

    const existing = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true, agencyId: true },
    });
    if (!existing) throw new NotFoundException('Wishlist not found');
    this.assertOwnsWishlist(existing, actor);

    await this.prisma.brandWishlist.delete({
      where: { id: params.wishlistId },
    });
  }

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
    const actor = await this.resolveOwner(params);

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true, agencyId: true },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    this.assertOwnsWishlist(wishlist, actor);

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
      update: params.addOnIds !== undefined ? { selectedAddOnIds } : {},
    });
  }

  async removeCreator(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
    creatorId: string;
  }): Promise<void> {
    const actor = await this.resolveOwner(params);

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: { brandId: true, agencyId: true },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    this.assertOwnsWishlist(wishlist, actor);

    await this.prisma.brandWishlistCreator.deleteMany({
      where: { wishlistId: params.wishlistId, creatorId: params.creatorId },
    });
  }

  async toggleShare(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    wishlistId: string;
  }): Promise<WishlistShareResponseDto> {
    const actor = await this.resolveOwner(params);

    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { id: params.wishlistId },
      select: {
        brandId: true,
        agencyId: true,
        shareEnabled: true,
        shareToken: true,
      },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');
    this.assertOwnsWishlist(wishlist, actor);

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
        agency: {
          select: { name: true, logoUrl: true, contactFullName: true },
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

    const ownerBrand = wishlist.brand
      ? {
          brandName: wishlist.brand.brandName ?? '',
          logoUrl: wishlist.brand.logoUrl ?? null,
          contactFullName: wishlist.brand.contactFullName ?? null,
        }
      : {
          brandName: wishlist.agency?.name ?? '',
          logoUrl: wishlist.agency?.logoUrl ?? null,
          contactFullName: wishlist.agency?.contactFullName ?? null,
        };

    return {
      id: wishlist.id,
      brandId: wishlist.brandId ?? null,
      agencyId: wishlist.agencyId ?? null,
      name: wishlist.name,
      sharedAt: wishlist.sharedAt ?? null,
      brand: ownerBrand,
      creators,
    };
  }

  async importFromShare(params: {
    actorUserId: string;
    brandProfileId?: string | null;
    shareToken: string;
    dto: ImportSharedWishlistDto;
  }): Promise<ImportSharedWishlistResponseDto> {
    const actor = await this.resolveOwner(params);
    const owner = this.brandAccess.orderOwnerCreateData(actor);

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

    if (
      (actor.brandId && source.brandId === actor.brandId) ||
      (actor.agencyId && source.agencyId === actor.agencyId)
    ) {
      throw new ConflictException(
        'This shortlist already belongs to your workspace',
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
      this.assertOwnsWishlist(target, actor);
      targetWishlistId = target.id;
      existingCreatorIds = new Set(target.creators.map((row) => row.creatorId));
    } else {
      const name = params.dto.name!.trim();
      try {
        const created = await this.prisma.brandWishlist.create({
          data: {
            ...owner,
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
