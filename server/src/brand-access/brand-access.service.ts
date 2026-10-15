import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgencyBrandLinkStatus, RoleName } from '@prisma/client';
import { agencyBrandPartnerLinksEnabled } from '../config/feature-flags.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  brandAccessSelect,
  type BrandAccessProfile,
  type ResolvedAgencyContext,
  type ResolvedBrandContext,
} from './brand-access.types';

export type ResolvedOrderActor = {
  brand: BrandAccessProfile | null;
  agency:
    | (ResolvedAgencyContext & {
        name: string;
        logoUrl: string | null;
        contactFullName: string;
        contactEmail: string;
        contactPhone: string | null;
      })
    | null;
  brandId: string | null;
  agencyId: string | null;
  actorUserId: string;
  brandActorUserId: string;
  isAgencyWorkspace: boolean;
  /**
   * The agency acting inside a brand's workspace via an ACTIVE partner link.
   *
   * Deliberately NOT surfaced through `agency`, which means "the agency owns
   * this". Callers branching on `actor.agency` must keep treating a linked
   * agency as the brand, or ownership would silently move. Only attribution
   * writes and the blocked-action checks read this field.
   */
  actingAgencyId: string | null;
};

@Injectable()
export class BrandAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Whether agencies may act inside linked brands' workspaces at all. */
  private partnerLinksEnabled(): boolean {
    return agencyBrandPartnerLinksEnabled(
      this.config.get<string>('AGENCY_BRAND_PARTNER_LINKS_ENABLED'),
    );
  }

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
      actingAgencyId: actor.actingAgencyId,
    };
  }

  async resolveOrderActor(params: {
    actorUserId: string;
    brandProfileId?: string | null;
  }): Promise<ResolvedOrderActor> {
    const explicitId = params.brandProfileId?.trim() || null;

    if (explicitId) {
      const brand = await this.loadBrandById(explicitId);
      const { actingAgencyId } = await this.resolveBrandAccess(
        params.actorUserId,
        brand,
      );
      const brandActorUserId = this.brandActorUserId(brand);
      return {
        brand,
        // agencyId stays null even for a linked agency: the BRAND owns this
        // workspace and everything created in it. That is what keeps the
        // brandId-XOR-agencyId invariant — and every query built on it — intact.
        agency: null,
        brandId: brand.id,
        agencyId: null,
        actorUserId: params.actorUserId,
        brandActorUserId,
        isAgencyWorkspace: false,
        actingAgencyId,
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
        actingAgencyId: null,
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
      // Legacy agency-direct mode: the agency is the OWNER here, not an actor
      // inside someone else's workspace, so there is nothing to attribute.
      actingAgencyId: null,
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

  /**
   * Who acted, for the attribution columns — never who owns.
   *
   * Spread alongside `orderOwnerCreateData()` on create. Both agency fields are
   * null in legacy agency-direct mode, where `orderOwnerCreateData()` already
   * records the agency as the owner and there is no "on behalf of" to capture.
   */
  actorAttributionCreateData(actor: ResolvedOrderActor): {
    placedByAgencyId: string | null;
    placedByUserId: string;
  } {
    return {
      placedByAgencyId: actor.actingAgencyId,
      placedByUserId: actor.actorUserId,
    };
  }

  /**
   * Refuse an action an agency must never take inside a brand's workspace.
   *
   * Covers taking money out (wallet withdrawals), changing the brand's identity
   * (profile, logo, contact details), and managing the brand's agency links —
   * that last one matters because brands may link several agencies, and without
   * it one agency could connect, cancel or revoke a rival.
   *
   * The brand's own user and an admin pass straight through: they have no
   * acting agency.
   */
  assertNotActingAsAgency(
    ctx: { actingAgencyId: string | null },
    action = 'This action',
  ): void {
    if (ctx.actingAgencyId) {
      throw new ForbiddenException(
        `${action} can only be done by the brand itself, not by a managing agency.`,
      );
    }
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

  /**
   * Decide whether this actor may operate inside this brand, and on what basis.
   *
   * Three ways in, checked cheapest first:
   *  1. the brand's own user — settled from the already-loaded row, no query;
   *  2. an agency holding an ACTIVE partner link — the new path;
   *  3. an admin.
   *
   * Returns the acting agency id when (and only when) access came via a link,
   * so the caller can attribute what follows without re-deriving it.
   */
  private async resolveBrandAccess(
    actorUserId: string,
    brand: { id: string; userId: string | null },
  ): Promise<{ actingAgencyId: string | null }> {
    if (brand.userId === actorUserId) return { actingAgencyId: null };

    if (this.partnerLinksEnabled()) {
      const agency = await this.prisma.agency.findUnique({
        where: { ownerUserId: actorUserId },
        select: { id: true },
      });

      if (agency) {
        const link = await this.prisma.agencyBrandLink.findUnique({
          where: {
            agencyId_brandId: { agencyId: agency.id, brandId: brand.id },
          },
          select: { status: true },
        });

        // Only ACTIVE grants anything. A PENDING request the brand has not
        // accepted, a REJECTED one, and a REVOKED one are all equivalent to
        // having no link at all.
        if (link?.status === AgencyBrandLinkStatus.ACTIVE) {
          return { actingAgencyId: agency.id };
        }
      }
    }

    if (await this.isAdmin(actorUserId)) return { actingAgencyId: null };

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

  requireBrandProfile(
    ctx: ResolvedBrandContext | ResolvedOrderActor,
  ): BrandAccessProfile {
    const brand = ctx.brand;
    const brandId = 'brandProfileId' in ctx ? ctx.brandProfileId : ctx.brandId;
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
