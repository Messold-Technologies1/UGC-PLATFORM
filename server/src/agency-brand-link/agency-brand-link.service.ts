import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgencyBrandLinkStatus } from '@prisma/client';
import {
  BRAND_COMPLETENESS_GAP_MESSAGES,
  brandProfileCompleteness,
  type BrandCompletenessGap,
} from '../brand-profile/brand-profile-completeness.util';
import {
  agencyBrandPartnerLinksEnabled,
  phoneOtpRequired,
} from '../config/feature-flags.util';
import { NotificationEventsService } from '../notifications/dispatch/notification-events.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The agency↔brand partnership.
 *
 * Direction matters and is easy to get backwards: the AGENCY owns the partner
 * code, the BRAND redeems it, and the AGENCY accepts. So the brand is the
 * requester here and the agency is the approver — the reverse of a typical
 * invite. Both sides end up consenting: the brand by typing the code, the
 * agency by accepting it.
 *
 * Only an ACTIVE link grants anything. Everything an agency then does inside
 * the brand's workspace stays owned by the brand (see BrandAccessService), so
 * revoking is clean — access stops, nothing is orphaned.
 */

export type BrandCompletenessError = {
  message: string;
  gaps: BrandCompletenessGap[];
  hints: string[];
};

@Injectable()
export class AgencyBrandLinkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationEventsService,
  ) {}

  /**
   * Same question `PhoneVerificationService.otpRequired()` answers, asked
   * through the shared helper rather than by injecting that service — which
   * would drag the WhatsApp and Twilio transports into this module for a single
   * boolean.
   */
  private otpRequired(): boolean {
    return phoneOtpRequired(this.config.get<string>('PHONE_OTP_ENABLED'));
  }

  private assertEnabled(): void {
    if (
      !agencyBrandPartnerLinksEnabled(
        this.config.get<string>('AGENCY_BRAND_PARTNER_LINKS_ENABLED'),
      )
    ) {
      throw new NotFoundException('Not found');
    }
  }

  // ------------------------------------------------------------ brand: request

  /**
   * A brand asks an agency to manage it, naming the agency by the email that
   * agency signs in with.
   *
   * Refuses unless the brand profile is complete (§ completeness util): the
   * agency is about to act under this brand's name on every order and brief a
   * creator sees, so the identity has to be real first.
   *
   * A malformed address, an address with no account, and an account that is
   * not an agency all give the same answer. That keeps the endpoint from
   * reporting which of those it was — it still tells a persistent caller that
   * some address belongs to an agency, which is why the route is rate
   * limited, but it does not distinguish "no such user" from "not an agency".
   */
  async requestLink(params: {
    brandUserId: string;
    rawAgencyEmail: string;
  }): Promise<{
    linkId: string;
    agencyName: string;
    status: AgencyBrandLinkStatus;
  }> {
    this.assertEnabled();

    const brand = await this.loadBrandForUser(params.brandUserId);
    this.assertBrandProfileComplete(brand);

    // Signup stores addresses lowercased, so match the same way rather than
    // relying on whatever casing the brand was given.
    const agencyEmail = params.rawAgencyEmail.trim().toLowerCase();
    const notFound = new NotFoundException(
      'No agency is registered with that email address',
    );
    if (!agencyEmail) throw notFound;

    const owner = await this.prisma.user.findUnique({
      where: { email: agencyEmail },
      select: { id: true },
    });
    if (!owner) throw notFound;

    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: owner.id },
      select: { id: true, name: true, ownerUserId: true },
    });
    if (!agency) throw notFound;

    // An agency owner who also holds a brand profile must not link to itself:
    // it would make the blocked-action checks meaningless, since the same
    // person would be on both sides.
    if (agency.ownerUserId === params.brandUserId) {
      throw new BadRequestException('You cannot link an agency to itself');
    }

    const existing = await this.prisma.agencyBrandLink.findUnique({
      where: { agencyId_brandId: { agencyId: agency.id, brandId: brand.id } },
      select: { id: true, status: true },
    });

    if (existing?.status === AgencyBrandLinkStatus.ACTIVE) {
      throw new ConflictException('This agency already manages your brand');
    }
    if (existing?.status === AgencyBrandLinkStatus.PENDING) {
      throw new ConflictException(
        'A request to this agency is already awaiting their response',
      );
    }

    // REJECTED and REVOKED both reopen: a relationship can be restarted, and
    // reusing the row keeps one history per pair rather than piling up
    // duplicates.
    const link = existing
      ? await this.prisma.agencyBrandLink.update({
          where: { id: existing.id },
          data: {
            status: AgencyBrandLinkStatus.PENDING,
            requestedViaEmail: agencyEmail,
            requestedByUserId: params.brandUserId,
            requestedAt: new Date(),
            respondedByUserId: null,
            respondedAt: null,
            revokedByUserId: null,
            revokedAt: null,
            revokedReason: null,
          },
          select: { id: true, status: true },
        })
      : await this.prisma.agencyBrandLink.create({
          data: {
            agencyId: agency.id,
            brandId: brand.id,
            status: AgencyBrandLinkStatus.PENDING,
            requestedViaEmail: agencyEmail,
            requestedByUserId: params.brandUserId,
          },
          select: { id: true, status: true },
        });

    // The agency has to act on this, so it is the one message in the flow that
    // must go out. `occurrenceKey` carries the request time because a
    // relationship can be reopened after a rejection or a revoke, and a second
    // request on the same row must not be swallowed as a duplicate of the first.
    // The row id is already the entityId, so the key need only say which
    // occurrence this is.
    await this.notifications.emit('agency-link-requested', {
      entityId: link.id,
      occurrenceKey: `requested-${Date.now()}`,
    });

    return { linkId: link.id, agencyName: agency.name, status: link.status };
  }

  // ------------------------------------------------------------ agency: respond

  /** The agency accepts, turning the request into real access. */
  async acceptLink(params: {
    agencyUserId: string;
    linkId: string;
  }): Promise<{ linkId: string; brandName: string | null }> {
    this.assertEnabled();

    const { link, agency } = await this.loadLinkForAgency(params);

    if (link.status !== AgencyBrandLinkStatus.PENDING) {
      throw new ConflictException('This request is no longer pending');
    }

    // Re-check completeness at accept: cheap, and it closes the window where a
    // brand empties its profile between requesting and being accepted.
    const brand = await this.loadBrandById(link.brandId);
    this.assertBrandProfileComplete(brand);

    await this.prisma.agencyBrandLink.update({
      where: { id: link.id },
      data: {
        status: AgencyBrandLinkStatus.ACTIVE,
        respondedByUserId: agency.ownerUserId,
        respondedAt: new Date(),
      },
    });

    await this.notifications.emit('agency-link-accepted', {
      entityId: link.id,
      occurrenceKey: `accepted-${Date.now()}`,
    });

    return { linkId: link.id, brandName: brand.brandName };
  }

  /** The agency declines. The brand may ask again later. */
  async rejectLink(params: {
    agencyUserId: string;
    linkId: string;
  }): Promise<{ linkId: string }> {
    this.assertEnabled();

    const { link, agency } = await this.loadLinkForAgency(params);

    if (link.status !== AgencyBrandLinkStatus.PENDING) {
      throw new ConflictException('This request is no longer pending');
    }

    await this.prisma.agencyBrandLink.update({
      where: { id: link.id },
      data: {
        status: AgencyBrandLinkStatus.REJECTED,
        respondedByUserId: agency.ownerUserId,
        respondedAt: new Date(),
      },
    });

    await this.notifications.emit('agency-link-rejected', {
      entityId: link.id,
      occurrenceKey: `rejected-${Date.now()}`,
    });

    return { linkId: link.id };
  }

  // -------------------------------------------------------------------- ending

  /**
   * End an active link, or withdraw a pending request.
   *
   * Either side may do it, and an admin may do it for support. The brand keeps
   * everything either way: orders the agency placed are ordinary brand-owned
   * orders, so there is nothing to transfer or unwind — the agency simply stops
   * having access, including to order chat.
   */
  async revokeLink(params: {
    linkId: string;
    actorUserId: string;
    actor: 'BRAND' | 'AGENCY' | 'ADMIN';
    reason?: string | null;
  }): Promise<{ linkId: string }> {
    this.assertEnabled();

    const link = await this.prisma.agencyBrandLink.findUnique({
      where: { id: params.linkId },
      select: {
        id: true,
        status: true,
        agency: { select: { ownerUserId: true } },
        brand: { select: { userId: true } },
      },
    });
    if (!link) throw new NotFoundException('Link not found');

    if (params.actor === 'BRAND' && link.brand.userId !== params.actorUserId) {
      throw new ForbiddenException('Not your link');
    }
    if (
      params.actor === 'AGENCY' &&
      link.agency.ownerUserId !== params.actorUserId
    ) {
      throw new ForbiddenException('Not your link');
    }

    if (
      link.status !== AgencyBrandLinkStatus.ACTIVE &&
      link.status !== AgencyBrandLinkStatus.PENDING
    ) {
      throw new ConflictException('This link is not active');
    }

    await this.prisma.agencyBrandLink.update({
      where: { id: link.id },
      data: {
        status: AgencyBrandLinkStatus.REVOKED,
        revokedByUserId: params.actorUserId,
        revokedAt: new Date(),
        revokedReason: params.reason?.trim() || null,
      },
    });

    await this.notifications.emit('agency-link-ended', {
      entityId: link.id,
      occurrenceKey: `ended-${Date.now()}`,
    });

    return { linkId: link.id };
  }

  // ------------------------------------------------------------------- reading

  /** Links on a brand's side: who manages it, and who has asked to. */
  async listForBrand(brandUserId: string) {
    this.assertEnabled();

    const brand = await this.loadBrandForUser(brandUserId);

    const links = await this.prisma.agencyBrandLink.findMany({
      where: {
        brandId: brand.id,
        status: {
          in: [AgencyBrandLinkStatus.PENDING, AgencyBrandLinkStatus.ACTIVE],
        },
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        respondedAt: true,
        agency: {
          select: { id: true, name: true, logoUrl: true, contactEmail: true },
        },
      },
    });

    return {
      // Surfaced even when empty so the client can explain what is missing
      // instead of silently disabling the connect button.
      completeness: this.completenessFor(brand),
      links: links.map((link) => ({
        id: link.id,
        status: link.status,
        requestedAt: link.requestedAt,
        respondedAt: link.respondedAt,
        agencyId: link.agency.id,
        agencyName: link.agency.name,
        agencyLogoUrl: link.agency.logoUrl,
        agencyContactEmail: link.agency.contactEmail,
      })),
    };
  }

  /** Links on an agency's side: the switcher list, plus incoming requests. */
  async listForAgency(agencyUserId: string) {
    this.assertEnabled();

    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: agencyUserId },
      select: { id: true },
    });
    if (!agency) throw new NotFoundException('Agency profile not found');

    const links = await this.prisma.agencyBrandLink.findMany({
      where: {
        agencyId: agency.id,
        status: {
          in: [AgencyBrandLinkStatus.PENDING, AgencyBrandLinkStatus.ACTIVE],
        },
      },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        respondedAt: true,
        brand: {
          select: { id: true, brandName: true, logoUrl: true },
        },
      },
    });

    return links.map((link) => ({
      id: link.id,
      status: link.status,
      requestedAt: link.requestedAt,
      respondedAt: link.respondedAt,
      brandId: link.brand.id,
      brandName: link.brand.brandName,
      brandLogoUrl: link.brand.logoUrl,
    }));
  }

  /**
   * What the agency has spent inside one brand's workspace.
   *
   * Reconciliation only. Money always lands in the brand's wallet — including
   * refunds for an order the agency paid for by card — so the agency needs a
   * record of what it funded to settle up off-platform.
   *
   * Derived from orders rather than the wallet ledger: the ledger is
   * append-only and each movement already points at its order, so joining
   * through `placedByAgencyId` answers this without adding a column to it.
   */
  async spendReport(params: { agencyUserId: string; brandId: string }) {
    this.assertEnabled();

    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: params.agencyUserId },
      select: { id: true },
    });
    if (!agency) throw new NotFoundException('Agency profile not found');

    await this.requireActiveLink(agency.id, params.brandId);

    const orders = await this.prisma.order.findMany({
      where: { brandId: params.brandId, placedByAgencyId: agency.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true,
        expectedAmountPaise: true,
        creditsAppliedPaise: true,
        placedByUserId: true,
      },
    });

    const totalPaise = orders.reduce(
      (sum, o) => sum + o.expectedAmountPaise,
      0,
    );
    const creditsPaise = orders.reduce(
      (sum, o) => sum + o.creditsAppliedPaise,
      0,
    );

    return {
      brandId: params.brandId,
      orderCount: orders.length,
      // What the brand's wallet covered vs. what was paid at checkout. The
      // split is the whole point: only the second is money the agency fronted.
      creditsAppliedPaise: creditsPaise,
      chargedPaise: totalPaise,
      orders,
    };
  }

  /**
   * Every link, for support. Shows REJECTED and REVOKED rows too — when
   * someone asks "why can't this agency see the brand any more", the answer is
   * usually in a row the brand-facing and agency-facing lists both hide.
   */
  async adminList(filters: { agencyId?: string; brandId?: string }) {
    this.assertEnabled();

    return this.prisma.agencyBrandLink.findMany({
      where: {
        ...(filters.agencyId ? { agencyId: filters.agencyId } : {}),
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        status: true,
        requestedAt: true,
        respondedAt: true,
        revokedAt: true,
        revokedReason: true,
        agency: { select: { id: true, name: true, contactEmail: true } },
        brand: { select: { id: true, brandName: true } },
      },
    });
  }

  // -------------------------------------------------------------------- shared

  private async requireActiveLink(agencyId: string, brandId: string) {
    const link = await this.prisma.agencyBrandLink.findUnique({
      where: { agencyId_brandId: { agencyId, brandId } },
      select: { status: true },
    });
    if (link?.status !== AgencyBrandLinkStatus.ACTIVE) {
      throw new ForbiddenException('You do not manage this brand');
    }
    return link;
  }

  private async loadLinkForAgency(params: {
    agencyUserId: string;
    linkId: string;
  }) {
    const agency = await this.prisma.agency.findUnique({
      where: { ownerUserId: params.agencyUserId },
      select: { id: true, ownerUserId: true },
    });
    if (!agency) throw new NotFoundException('Agency profile not found');

    const link = await this.prisma.agencyBrandLink.findUnique({
      where: { id: params.linkId },
      select: { id: true, status: true, agencyId: true, brandId: true },
    });
    if (!link || link.agencyId !== agency.id) {
      throw new NotFoundException('Link not found');
    }

    return { link, agency };
  }

  /**
   * Is the caller asking to act inside a brand that is not their own?
   *
   * The active-brand header is a request for a workspace, not proof of one,
   * and it lives in localStorage per browser rather than per account — so a
   * brand owner can be handed one left behind by an agency that used the same
   * browser. Their own brand's id in that header means nothing is being acted
   * for; any other id means somebody is working on another brand's behalf.
   */
  async isActingForAnotherBrand(
    userId: string,
    brandProfileId: string | null | undefined,
  ): Promise<boolean> {
    if (!brandProfileId) return false;

    const own = await this.prisma.brandProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    return own?.id !== brandProfileId;
  }

  private async loadBrandForUser(userId: string) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { userId },
      select: this.brandCompletenessSelect,
    });
    if (!brand) throw new NotFoundException('Brand profile not found');
    return brand;
  }

  private async loadBrandById(brandId: string) {
    const brand = await this.prisma.brandProfile.findUnique({
      where: { id: brandId },
      select: this.brandCompletenessSelect,
    });
    if (!brand) throw new NotFoundException('Brand profile not found');
    return brand;
  }

  private readonly brandCompletenessSelect = {
    id: true,
    brandName: true,
    contactFullName: true,
    contactPhone: true,
    user: {
      select: { phone: true, phoneVerified: true, phoneOtpLastStatus: true },
    },
  } as const;

  private completenessFor(brand: {
    brandName: string | null;
    contactFullName: string | null;
    contactPhone: string | null;
    user: {
      phoneVerified: boolean;
      phoneOtpLastStatus: string | null;
    } | null;
  }) {
    return brandProfileCompleteness({
      profile: brand,
      user: brand.user ?? {},
      otpRequired: this.otpRequired(),
    });
  }

  /**
   * 422 with the full gap list, so the client can point at the exact field (or
   * the OTP step) instead of showing a generic validation error.
   */
  private assertBrandProfileComplete(
    brand: Parameters<AgencyBrandLinkService['completenessFor']>[0],
  ): void {
    const { complete, gaps } = this.completenessFor(brand);
    if (complete) return;

    throw new UnprocessableEntityException({
      message: 'Complete your brand profile before connecting an agency',
      gaps,
      hints: gaps.map((gap) => BRAND_COMPLETENESS_GAP_MESSAGES[gap]),
    } satisfies BrandCompletenessError);
  }
}
