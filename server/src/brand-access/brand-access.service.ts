import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  brandAccessSelect,
  type BrandAccessProfile,
  type ResolvedAgencyContext,
  type ResolvedBrandContext,
} from './brand-access.types';

export type ResolvedOrderActor = {
  brand: BrandAccessProfile | null;
  agency: (ResolvedAgencyContext & {
    name: string;
    logoUrl: string | null;
    contactFullName: string;
    contactEmail: string;
    contactPhone: string | null;
  }) | null;
  brandId: string | null;
  agencyId: string | null;
  actorUserId: string;
  brandActorUserId: string;
  isAgencyWorkspace: boolean;
};

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

  brandActorUserId(brand: { userId: string | null }): string {
    if (brand.userId) return brand.userId;
    throw new NotFoundException('Brand has no associated user');
  }

  async getAgencyForOwner(ownerUserId: string) {
    return this.prisma.agency.findUnique({
      where: { ownerUserId },
      select: {
        id: true,
        brandNames: true,
      },
    });
  }

  async resolveBrandContext(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<ResolvedBrandContext> {
    const actor = await this.resolveOrderActor(params);
    return {
      brand: actor.brand,
      agency: actor.agency
        ? { id: actor.agency.id, ownerUserId: actor.agency.ownerUserId }
        : null,
      brandProfileId: actor.brandId,
      agencyId: actor.agencyId,
      actorUserId: actor.actorUserId,
      brandActorUserId: actor.brandActorUserId,
      isAgencyWorkspace: actor.isAgencyWorkspace,
    };
  }

  async resolveOrderActor(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<ResolvedOrderActor> {
    const explicitId = params.brandProfileId?.trim() || null;

    if (explicitId) {
      const brand = await this.loadBrandById(explicitId);
      await this.assertActorCanAccessBrand(params.actorUserId, brand);
      const brandActorUserId = this.brandActorUserId(brand);
      return {
        brand,
        agency: null,
        brandId: brand.id,
        agencyId: null,
        actorUserId: params.actorUserId,
        brandActorUserId,
        isAgencyWorkspace: false,
      };
    }

    const standalone = await this.prisma.brandProfile.findUnique({
      where: { userId: params.actorUserId },
      select: brandAccessSelect,
    });
    if (standalone) {
      const brandActorUserId = this.brandActorUserId(standalone);
      return {
        brand: standalone,
        agency: null,
        brandId: standalone.id,
        agencyId: null,
        actorUserId: params.actorUserId,
        brandActorUserId,
        isAgencyWorkspace: false,
      };
    }

    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: params.actorUserId },
      select: {
        id: true,
        ownerUserId: true,
        name: true,
        logoUrl: true,
        contactFullName: true,
        contactEmail: true,
        contactPhone: true,
      },
    });
    if (!agency) {
      throw new NotFoundException('Brand profile not found');
    }

    return {
      brand: null,
      agency,
      brandId: null,
      agencyId: agency.id,
      actorUserId: params.actorUserId,
      brandActorUserId: agency.ownerUserId,
      isAgencyWorkspace: true,
    };
  }

  orderOwnerCreateData(actor: ResolvedOrderActor): {
    brandId: string | null;
    agencyId: string | null;
  } {
    if (actor.agencyId) {
      return { brandId: null, agencyId: actor.agencyId };
    }
    if (actor.brandId) {
      return { brandId: actor.brandId, agencyId: null };
    }
    throw new BadRequestException('Order owner is required');
  }

  orderOwnerWhere(actor: ResolvedOrderActor): {
    brandId?: string;
    agencyId?: string;
  } {
    if (actor.agencyId) return { agencyId: actor.agencyId };
    if (actor.brandId) return { brandId: actor.brandId };
    throw new BadRequestException('Order owner is required');
  }

  assertOwnsOrder(
    order: { brandId: string | null; agencyId: string | null },
    actor: ResolvedOrderActor,
  ): void {
    if (actor.brandId && order.brandId === actor.brandId) return;
    if (actor.agencyId && order.agencyId === actor.agencyId) return;
    throw new ForbiddenException('Not your order');
  }

  private async assertActorCanAccessBrand(
    actorUserId: string,
    brand: {
      userId: string | null;
    },
  ): Promise<void> {
    if (await this.isAdmin(actorUserId)) return;
    if (brand.userId === actorUserId) return;
    throw new ForbiddenException('Not allowed to access this brand');
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

  requireBrandProfile(ctx: ResolvedBrandContext | ResolvedOrderActor): BrandAccessProfile {
    const brand = ctx.brand;
    const brandId =
      'brandProfileId' in ctx ? ctx.brandProfileId : ctx.brandId;
    if (!brand || !brandId) {
      throw new BadRequestException(
        'This action requires a standalone brand profile.',
      );
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
      },
    });
    if (!brand) {
      throw new NotFoundException('Brand profile not found');
    }
    return this.brandActorUserId(brand);
  }

  async resolveBuyerActorUserId(params: {
    brandId?: string | null;
    agencyId?: string | null;
  }): Promise<string> {
    if (params.agencyId) {
      const agency = await this.prisma.agency.findUnique({
        where: { id: params.agencyId },
        select: { ownerUserId: true },
      });
      if (!agency) throw new NotFoundException('Agency not found');
      return agency.ownerUserId;
    }
    if (params.brandId) {
      return this.resolveBrandActorUserIdForProfile(params.brandId);
    }
    throw new NotFoundException('Order has no buyer');
  }
}
