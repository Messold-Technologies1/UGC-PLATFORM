import { ForbiddenException } from '@nestjs/common';
import { AgencyBrandLinkStatus } from '@prisma/client';
import { BrandAccessService } from './brand-access.service';

/**
 * Who may act inside a brand's workspace. This is the gate the whole partner
 * link rests on, so the cases below are mostly about who must be kept OUT.
 */

const BRAND_ID = 'brand-1';
const BRAND_USER = 'brand-user-1';
const AGENCY_ID = 'agency-1';
const AGENCY_USER = 'agency-user-1';

type LinkRow = { status: AgencyBrandLinkStatus } | null;

function buildService(opts: {
  flagEnabled?: boolean;
  link?: LinkRow;
  agencyForUser?: { id: string } | null;
  isAdmin?: boolean;
}) {
  const prisma = {
    brandProfile: {
      findUnique: jest.fn(() =>
        Promise.resolve({ id: BRAND_ID, userId: BRAND_USER }),
      ),
    },
    agency: {
      findUnique: jest.fn(() =>
        Promise.resolve(
          opts.agencyForUser === undefined
            ? { id: AGENCY_ID }
            : opts.agencyForUser,
        ),
      ),
    },
    agencyBrandLink: {
      findUnique: jest.fn(() =>
        Promise.resolve(opts.link === undefined ? null : opts.link),
      ),
    },
    user: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          primaryRole: { name: opts.isAdmin ? 'ADMIN' : 'BRAND' },
          userRoles: [],
        }),
      ),
    },
  };

  const config = {
    get: jest.fn(() => (opts.flagEnabled ? 'true' : 'false')),
  };

  return {
    service: new BrandAccessService(prisma as never, config as never),
    prisma,
  };
}

describe('BrandAccessService — agency acting inside a brand workspace', () => {
  it('lets the brand owner in, with no acting agency', async () => {
    const { service } = buildService({ flagEnabled: true });

    const actor = await service.resolveOrderActor({
      actorUserId: BRAND_USER,
      brandProfileId: BRAND_ID,
    });

    expect(actor.brandId).toBe(BRAND_ID);
    expect(actor.actingAgencyId).toBeNull();
  });

  it('lets an agency with an ACTIVE link act, and records it as the actor', async () => {
    const { service } = buildService({
      flagEnabled: true,
      link: { status: AgencyBrandLinkStatus.ACTIVE },
    });

    const actor = await service.resolveOrderActor({
      actorUserId: AGENCY_USER,
      brandProfileId: BRAND_ID,
    });

    expect(actor.actingAgencyId).toBe(AGENCY_ID);
  });

  it('keeps ownership with the brand when an agency acts', async () => {
    // The invariant the whole design rests on: an agency-placed order is an
    // ordinary brand-owned order, so every existing owner query still works.
    const { service } = buildService({
      flagEnabled: true,
      link: { status: AgencyBrandLinkStatus.ACTIVE },
    });

    const actor = await service.resolveOrderActor({
      actorUserId: AGENCY_USER,
      brandProfileId: BRAND_ID,
    });

    expect(actor.brandId).toBe(BRAND_ID);
    expect(actor.agencyId).toBeNull();
    expect(actor.agency).toBeNull();
    expect(actor.isAgencyWorkspace).toBe(false);
    expect(service.orderOwnerCreateData(actor)).toEqual({
      brandId: BRAND_ID,
      agencyId: null,
    });
    expect(service.orderOwnerWhere(actor)).toEqual({ brandId: BRAND_ID });
  });

  it.each([
    ['PENDING', AgencyBrandLinkStatus.PENDING],
    ['REJECTED', AgencyBrandLinkStatus.REJECTED],
    ['REVOKED', AgencyBrandLinkStatus.REVOKED],
  ])('refuses an agency whose link is %s', async (_label, status) => {
    const { service } = buildService({ flagEnabled: true, link: { status } });

    await expect(
      service.resolveOrderActor({
        actorUserId: AGENCY_USER,
        brandProfileId: BRAND_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an agency with no link at all', async () => {
    const { service } = buildService({ flagEnabled: true, link: null });

    await expect(
      service.resolveOrderActor({
        actorUserId: AGENCY_USER,
        brandProfileId: BRAND_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a stranger who is neither owner, agency nor admin', async () => {
    const { service } = buildService({
      flagEnabled: true,
      agencyForUser: null,
    });

    await expect(
      service.resolveOrderActor({
        actorUserId: 'someone-else',
        brandProfileId: BRAND_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an ACTIVE link while the feature flag is off', async () => {
    // The kill switch has to actually cut access, not just hide the UI.
    const { service, prisma } = buildService({
      flagEnabled: false,
      link: { status: AgencyBrandLinkStatus.ACTIVE },
    });

    await expect(
      service.resolveOrderActor({
        actorUserId: AGENCY_USER,
        brandProfileId: BRAND_ID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // Not even looked up: the flag short-circuits before touching the table.
    expect(prisma.agencyBrandLink.findUnique).not.toHaveBeenCalled();
  });

  it('still lets an admin in, without marking them as an acting agency', async () => {
    const { service } = buildService({
      flagEnabled: true,
      agencyForUser: null,
      isAdmin: true,
    });

    const actor = await service.resolveOrderActor({
      actorUserId: 'admin-user',
      brandProfileId: BRAND_ID,
    });

    expect(actor.actingAgencyId).toBeNull();
  });

  it('settles the owner case without querying links or roles', async () => {
    const { service, prisma } = buildService({ flagEnabled: true });

    await service.resolveOrderActor({
      actorUserId: BRAND_USER,
      brandProfileId: BRAND_ID,
    });

    expect(prisma.agency.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('BrandAccessService.actorAttributionCreateData', () => {
  it('attributes to the acting agency and the real user', () => {
    const { service } = buildService({ flagEnabled: true });

    expect(
      service.actorAttributionCreateData({
        actingAgencyId: AGENCY_ID,
        actorUserId: AGENCY_USER,
      } as never),
    ).toEqual({ placedByAgencyId: AGENCY_ID, placedByUserId: AGENCY_USER });
  });

  it('records no agency when the brand acts for itself', () => {
    const { service } = buildService({ flagEnabled: true });

    expect(
      service.actorAttributionCreateData({
        actingAgencyId: null,
        actorUserId: BRAND_USER,
      } as never),
    ).toEqual({ placedByAgencyId: null, placedByUserId: BRAND_USER });
  });
});

describe('BrandAccessService.assertNotActingAsAgency', () => {
  it('blocks an acting agency', () => {
    const { service } = buildService({ flagEnabled: true });

    expect(() =>
      service.assertNotActingAsAgency(
        { actingAgencyId: AGENCY_ID },
        'Withdrawing credits',
      ),
    ).toThrow(ForbiddenException);
  });

  it('lets the brand itself through', () => {
    const { service } = buildService({ flagEnabled: true });

    expect(() =>
      service.assertNotActingAsAgency({ actingAgencyId: null }),
    ).not.toThrow();
  });
});
