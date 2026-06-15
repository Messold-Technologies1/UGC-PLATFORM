import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ApprovalStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BrandAccessService } from '../brand-access/brand-access.service';
import { CreatorProfileService } from '../creator-profile/creator-profile.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { UpdateWishlistDto } from './dto/update-wishlist.dto';
import { WishlistDto, WishlistDetailDto } from './dto/wishlist.dto';
import { ListWishlistsResponseDto } from './dto/list-wishlists-response.dto';
import { CreateWishlistResponseDto } from './dto/create-wishlist-response.dto';
import { WishlistShareResponseDto } from './dto/wishlist-share-response.dto';
import { PublicWishlistResponseDto } from './dto/public-wishlist-response.dto';

@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly brandAccess: BrandAccessService,
    private readonly creatorProfile: CreatorProfileService,
  ) {}

  /** Resolve the active brand profile id for the acting user. */
  private async resolveBrandId(params: {
    actorUserId: string;
    brandProfileId?: string;
  }): Promise<string> {
    const ctx = await this.brandAccess.resolveBrandContext({
      actorUserId: params.actorUserId,
      brandProfileId: params.brandProfileId ?? null,
    });
    return ctx.brandProfileId;
  }

  private toWishlistDto(row: {
    id: string;
    name: string;
    shareEnabled: boolean;
    shareToken: string | null;
    sharedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { creators: number };
  }): WishlistDto {
    return {
      id: row.id,
      name: row.name,
      creatorCount: row._count?.creators ?? 0,
      shareEnabled: row.shareEnabled,
      shareToken: row.shareToken,
      sharedAt: row.sharedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Filter the provided creator ids down to those that exist and are approved. */
  private async filterApprovedCreatorIds(
    creatorIds: string[],
  ): Promise<string[]> {
    const unique = [...new Set(creatorIds.filter(Boolean))];
    if (unique.length === 0) return [];
    const rows = await this.prisma.creatorProfile.findMany({
      where: {
        id: { in: unique },
        creatorApproval: { status: ApprovalStatus.APPROVED },
      },
      select: { id: true },
    });
    const approved = new Set(rows.map((r) => r.id));
    return creatorIds.filter((id) => approved.has(id));
  }

  async listWishlists(params: {
    actorUserId: string;
    brandProfileId?: string;
  }): Promise<ListWishlistsResponseDto> {
    const brandId = await this.resolveBrandId(params);
    const rows = await this.prisma.brandWishlist.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { creators: true } } },
    });
    return { items: rows.map((row) => this.toWishlistDto(row)) };
  }

  async createWishlist(params: {
    actorUserId: string;
    brandProfileId?: string;
    dto: CreateWishlistDto;
  }): Promise<CreateWishlistResponseDto> {
    const brandId = await this.resolveBrandId(params);
    const name = params.dto.name.trim();

    const existing = await this.prisma.brandWishlist.findFirst({
      where: { brandId, name },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A wishlist with this name already exists');
    }

    const approvedIds = await this.filterApprovedCreatorIds(
      params.dto.creatorIds ?? [],
    );

    const created = await this.prisma.brandWishlist.create({
      data: {
        brandId,
        name,
        creators: {
          create: approvedIds.map((creatorId, index) => ({
            creatorId,
            sortOrder: index,
          })),
        },
      },
      select: { id: true },
    });

    return { id: created.id };
  }

  private async loadOwnedWishlist(brandId: string, wishlistId: string) {
    const row = await this.prisma.brandWishlist.findFirst({
      where: { id: wishlistId, brandId },
      include: { _count: { select: { creators: true } } },
    });
    if (!row) {
      throw new NotFoundException('Wishlist not found');
    }
    return row;
  }

  async getWishlistDetail(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
  }): Promise<WishlistDetailDto> {
    const brandId = await this.resolveBrandId(params);
    const wishlist = await this.loadOwnedWishlist(brandId, params.wishlistId);

    const creatorRows = await this.prisma.brandWishlistCreator.findMany({
      where: { wishlistId: wishlist.id },
      orderBy: { sortOrder: 'asc' },
      select: { creatorId: true },
    });
    const creators = await this.creatorProfile.getApprovedPublicListItemsByIds(
      creatorRows.map((r) => r.creatorId),
    );

    return { ...this.toWishlistDto(wishlist), creators };
  }

  async updateWishlist(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
    dto: UpdateWishlistDto;
  }): Promise<WishlistDto> {
    const brandId = await this.resolveBrandId(params);
    await this.loadOwnedWishlist(brandId, params.wishlistId);

    const { dto } = params;
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const clash = await this.prisma.brandWishlist.findFirst({
        where: { brandId, name, id: { not: params.wishlistId } },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException('A wishlist with this name already exists');
      }
    }

    if (dto.creatorIds !== undefined) {
      const approvedIds = await this.filterApprovedCreatorIds(dto.creatorIds);
      await this.prisma.$transaction([
        this.prisma.brandWishlistCreator.deleteMany({
          where: { wishlistId: params.wishlistId },
        }),
        ...(approvedIds.length
          ? [
              this.prisma.brandWishlistCreator.createMany({
                data: approvedIds.map((creatorId, index) => ({
                  wishlistId: params.wishlistId,
                  creatorId,
                  sortOrder: index,
                })),
              }),
            ]
          : []),
      ]);
    }

    const updated = await this.prisma.brandWishlist.update({
      where: { id: params.wishlistId },
      data: dto.name !== undefined ? { name: dto.name.trim() } : {},
      include: { _count: { select: { creators: true } } },
    });
    return this.toWishlistDto(updated);
  }

  async deleteWishlist(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
  }): Promise<void> {
    const brandId = await this.resolveBrandId(params);
    await this.loadOwnedWishlist(brandId, params.wishlistId);
    await this.prisma.brandWishlist.delete({
      where: { id: params.wishlistId },
    });
  }

  async addCreator(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
    creatorId: string;
  }): Promise<WishlistDto> {
    const brandId = await this.resolveBrandId(params);
    await this.loadOwnedWishlist(brandId, params.wishlistId);

    const approved = await this.filterApprovedCreatorIds([params.creatorId]);
    if (approved.length === 0) {
      throw new NotFoundException('Creator not found');
    }

    const existing = await this.prisma.brandWishlistCreator.findUnique({
      where: {
        wishlistId_creatorId: {
          wishlistId: params.wishlistId,
          creatorId: params.creatorId,
        },
      },
      select: { id: true },
    });
    if (!existing) {
      const max = await this.prisma.brandWishlistCreator.aggregate({
        where: { wishlistId: params.wishlistId },
        _max: { sortOrder: true },
      });
      await this.prisma.brandWishlistCreator.create({
        data: {
          wishlistId: params.wishlistId,
          creatorId: params.creatorId,
          sortOrder: (max._max.sortOrder ?? -1) + 1,
        },
      });
    }

    const fresh = await this.loadOwnedWishlist(brandId, params.wishlistId);
    return this.toWishlistDto(fresh);
  }

  async removeCreator(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
    creatorId: string;
  }): Promise<WishlistDto> {
    const brandId = await this.resolveBrandId(params);
    await this.loadOwnedWishlist(brandId, params.wishlistId);

    await this.prisma.brandWishlistCreator.deleteMany({
      where: { wishlistId: params.wishlistId, creatorId: params.creatorId },
    });

    const fresh = await this.loadOwnedWishlist(brandId, params.wishlistId);
    return this.toWishlistDto(fresh);
  }

  /** Add the creator if absent, remove if present. */
  async toggleCreator(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
    creatorId: string;
  }): Promise<{ added: boolean }> {
    const brandId = await this.resolveBrandId(params);
    await this.loadOwnedWishlist(brandId, params.wishlistId);

    const existing = await this.prisma.brandWishlistCreator.findUnique({
      where: {
        wishlistId_creatorId: {
          wishlistId: params.wishlistId,
          creatorId: params.creatorId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.brandWishlistCreator.delete({
        where: { id: existing.id },
      });
      return { added: false };
    }

    const approved = await this.filterApprovedCreatorIds([params.creatorId]);
    if (approved.length === 0) {
      throw new NotFoundException('Creator not found');
    }
    const max = await this.prisma.brandWishlistCreator.aggregate({
      where: { wishlistId: params.wishlistId },
      _max: { sortOrder: true },
    });
    await this.prisma.brandWishlistCreator.create({
      data: {
        wishlistId: params.wishlistId,
        creatorId: params.creatorId,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    return { added: true };
  }

  /** For a given creator, list each wishlist with whether the creator is saved in it. */
  async getCreatorStatus(params: {
    actorUserId: string;
    brandProfileId?: string;
    creatorId: string;
  }): Promise<{
    items: { id: string; name: string; creatorCount: number; saved: boolean }[];
  }> {
    const brandId = await this.resolveBrandId(params);
    const rows = await this.prisma.brandWishlist.findMany({
      where: { brandId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { creators: true } },
        creators: {
          where: { creatorId: params.creatorId },
          select: { id: true },
        },
      },
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        creatorCount: row._count.creators,
        saved: row.creators.length > 0,
      })),
    };
  }

  async enableShare(params: {
    actorUserId: string;
    brandProfileId?: string;
    wishlistId: string;
  }): Promise<WishlistShareResponseDto> {
    const brandId = await this.resolveBrandId(params);
    const wishlist = await this.loadOwnedWishlist(brandId, params.wishlistId);

    let shareToken = wishlist.shareToken;
    if (!shareToken) {
      shareToken = randomBytes(18).toString('base64url');
    }

    const updated = await this.prisma.brandWishlist.update({
      where: { id: params.wishlistId },
      data: {
        shareToken,
        shareEnabled: true,
        sharedAt: new Date(),
      },
      select: { shareEnabled: true, shareToken: true, sharedAt: true },
    });

    return {
      shareEnabled: updated.shareEnabled,
      shareToken: updated.shareToken!,
      sharedAt: updated.sharedAt,
    };
  }

  async getPublicWishlist(
    shareToken: string,
  ): Promise<PublicWishlistResponseDto> {
    const wishlist = await this.prisma.brandWishlist.findUnique({
      where: { shareToken },
      include: {
        brand: { select: { brandName: true, logoUrl: true } },
        creators: {
          orderBy: { sortOrder: 'asc' },
          select: { creatorId: true },
        },
      },
    });

    if (!wishlist || !wishlist.shareEnabled) {
      throw new NotFoundException('Shared wishlist not found');
    }

    const creators = await this.creatorProfile.getApprovedPublicListItemsByIds(
      wishlist.creators.map((c) => c.creatorId),
    );

    return {
      id: wishlist.id,
      name: wishlist.name,
      brand: {
        brandName: wishlist.brand.brandName,
        logoUrl: wishlist.brand.logoUrl,
      },
      creators,
    };
  }
}
