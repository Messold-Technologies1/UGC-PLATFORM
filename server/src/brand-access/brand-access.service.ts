import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { brandAccessSelect, type ResolvedBrandContext } from './brand-access.types';

@Injectable()
export class BrandAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) return false;
    if (user.primaryRole?.name === RoleName.ADMIN) return true;
    return user.userRoles.some((ur) => ur.role.name === RoleName.ADMIN);
  }

  brandActorUserId(brand: {
    userId: string | null;
    agency: { ownerUserId: string } | null;
  }): string {
    if (brand.userId) return brand.userId;
    const ownerId = brand.agency?.ownerUserId;
    if (!ownerId) {
      throw new NotFoundException('Brand has no associated user');
    }
    return ownerId;
  }

  async getAgencyForOwner(ownerUserId: string) {
    return this.prisma.agency.findUnique({
      where: { ownerUserId },
      include: {
        brands: {
          select: {
            id: true,
            brandName: true,
            logoUrl: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async resolveBrandContext(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<ResolvedBrandContext> {
    const explicitId = params.brandProfileId?.trim() || null;

    if (explicitId) {
      const brand = await this.loadBrandById(explicitId);
      await this.assertActorCanAccessBrand(params.actorUserId, brand);
      return this.toContext(brand, params.actorUserId);
    }

    const standalone = await this.prisma.brandProfile.findUnique({
      where: { userId: params.actorUserId },
      select: brandAccessSelect,
    });
    if (standalone) {
      return this.toContext(standalone, params.actorUserId);
    }

    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: params.actorUserId },
      select: {
        id: true,
        lastActiveBrandProfileId: true,
        brands: { select: { id: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!agency) {
      throw new NotFoundException('Brand profile not found');
    }

    if (agency.brands.length === 0) {
      throw new BadRequestException(
        'No brand profiles under this agency. Create a brand first.',
      );
    }

    let targetId: string | null = agency.lastActiveBrandProfileId;
    if (targetId && !agency.brands.some((b) => b.id === targetId)) {
      targetId = null;
    }
    if (!targetId && agency.brands.length === 1) {
      targetId = agency.brands[0]!.id;
    }
    if (!targetId) {
      throw new BadRequestException(
        'Active brand is required. Select a brand or send X-Brand-Profile-Id.',
      );
    }

    const brand = await this.loadBrandById(targetId);
    return this.toContext(brand, params.actorUserId);
  }

  private async assertActorCanAccessBrand(
    actorUserId: string,
    brand: {
      userId: string | null;
      agencyId: string | null;
      agency: { ownerUserId: string } | null;
    },
  ): Promise<void> {
    if (await this.isAdmin(actorUserId)) return;
    if (brand.userId === actorUserId) return;
    if (brand.agency?.ownerUserId === actorUserId) return;
    throw new ForbiddenException('Not allowed to access this brand');
  }

  private toContext(
    brand: Awaited<ReturnType<typeof this.loadBrandById>>,
    actorUserId: string,
  ): ResolvedBrandContext {
    const brandActorUserId = this.brandActorUserId(brand);
    return {
      brand,
      brandProfileId: brand.id,
      actorUserId,
      brandActorUserId,
      isAgencyManaged: brand.agencyId != null,
    };
  }

  private async loadBrandById(id: string) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id },
      select: brandAccessSelect,
    });
    if (!brand) {
      throw new NotFoundException('Brand profile not found');
    }
    return brand;
  }

  async resolveBrandActorUserIdForProfile(
    brandProfileId: string,
  ): Promise<string> {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id: brandProfileId },
      select: {
        userId: true,
        agency: { select: { ownerUserId: true } },
      },
    });
    if (!brand) {
      throw new NotFoundException('Brand profile not found');
    }
    return this.brandActorUserId(brand);
  }
}
