import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AgencyBrandLinkStatus } from '@prisma/client';
import { AgencyBrandLinkService } from './agency-brand-link.service';

/**
 * `expect.objectContaining` is typed `any`, which trips no-unsafe-assignment
 * when nested inside another matcher's object literal. Narrowing it once here
 * keeps the assertions below readable.
 */
const containing = (shape: Record<string, unknown>): unknown =>
  expect.objectContaining(shape) as unknown;

const BRAND_ID = 'brand-1';
const BRAND_USER = 'brand-user-1';
const AGENCY_ID = 'agency-1';
const AGENCY_USER = 'agency-user-1';
const PARTNER_ID = 'GC-7F3K-92QX';

type BrandFixture = {
  id: string;
  brandName: string | null;
  contactFullName: string | null;
  contactPhone: string | null;
  user: {
    phone: string | null;
    phoneVerified: boolean;
    phoneOtpLastStatus: string | null;
  } | null;
};

const completeBrand: BrandFixture = {
  id: BRAND_ID,
  brandName: 'Acme',
  contactFullName: 'Jane Doe',
  contactPhone: '+919876543210',
  user: {
    phone: '+919876543210',
    phoneVerified: true,
    phoneOtpLastStatus: 'approved',
  },
};

type Options = {
  flagEnabled?: boolean;
  otpEnabled?: boolean;
  brand?: BrandFixture | null;
  agencyByPartnerId?: {
    id: string;
    name: string;
    ownerUserId: string;
  } | null;
  agencyByOwner?: { id: string; ownerUserId: string } | null;
  existingLink?: { id: string; status: AgencyBrandLinkStatus } | null;
  linkById?: Record<string, unknown> | null;
};

function build(opts: Options = {}) {
  const prisma = {
    brandProfile: {
      findUnique: jest.fn(() =>
        Promise.resolve(opts.brand === undefined ? completeBrand : opts.brand),
      ),
    },
    agency: {
      findUnique: jest.fn((args: { where: Record<string, unknown> }) => {
        if ('partnerId' in args.where) {
          return Promise.resolve(
            opts.agencyByPartnerId === undefined
              ? { id: AGENCY_ID, name: 'Best Agency', ownerUserId: AGENCY_USER }
              : opts.agencyByPartnerId,
          );
        }
        return Promise.resolve(
          opts.agencyByOwner === undefined
            ? { id: AGENCY_ID, ownerUserId: AGENCY_USER }
            : opts.agencyByOwner,
        );
      }),
      update: jest.fn(() => Promise.resolve({})),
    },
    agencyBrandLink: {
      findUnique: jest.fn((args: { where: Record<string, unknown> }) => {
        if ('id' in args.where) {
          return Promise.resolve(
            opts.linkById === undefined
              ? {
                  id: 'link-1',
                  status: AgencyBrandLinkStatus.PENDING,
                  agencyId: AGENCY_ID,
                  brandId: BRAND_ID,
                  agency: { ownerUserId: AGENCY_USER },
                  brand: { userId: BRAND_USER },
                }
              : opts.linkById,
          );
        }
        return Promise.resolve(
          opts.existingLink === undefined ? null : opts.existingLink,
        );
      }),
      create: jest.fn(() =>
        Promise.resolve({
          id: 'link-new',
          status: AgencyBrandLinkStatus.PENDING,
        }),
      ),
      update: jest.fn(() =>
        Promise.resolve({
          id: 'link-1',
          status: AgencyBrandLinkStatus.PENDING,
        }),
      ),
      findMany: jest.fn(() => Promise.resolve([])),
    },
    order: { findMany: jest.fn(() => Promise.resolve([])) },
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'AGENCY_BRAND_PARTNER_LINKS_ENABLED') {
        return opts.flagEnabled === false ? 'false' : 'true';
      }
      if (key === 'PHONE_OTP_ENABLED') {
        return opts.otpEnabled === false ? 'false' : 'true';
      }
      return undefined;
    }),
  };

  return {
    service: new AgencyBrandLinkService(prisma as never, config as never),
    prisma,
  };
}

describe('AgencyBrandLinkService — the feature flag', () => {
  it('hides every route when the flag is off', async () => {
    const { service } = build({ flagEnabled: false });

    await expect(
      service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: PARTNER_ID,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.listForBrand(BRAND_USER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.listForAgency(AGENCY_USER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('AgencyBrandLinkService.requestLink — the brand redeems the code', () => {
  it('creates a pending request and names the agency', async () => {
    const { service, prisma } = build();

    const result = await service.requestLink({
      brandUserId: BRAND_USER,
      rawPartnerId: PARTNER_ID,
    });

    expect(result.status).toBe(AgencyBrandLinkStatus.PENDING);
    expect(result.agencyName).toBe('Best Agency');
    expect(prisma.agencyBrandLink.create).toHaveBeenCalled();
  });

  it('normalizes a sloppily pasted code before looking it up', async () => {
    const { service, prisma } = build();

    await service.requestLink({
      brandUserId: BRAND_USER,
      rawPartnerId: '  gc7f3k92qx ',
    });

    expect(prisma.agency.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { partnerId: PARTNER_ID } }),
    );
  });

  it('refuses an incomplete brand profile and lists every gap', async () => {
    const { service, prisma } = build({
      brand: {
        ...completeBrand,
        brandName: null,
        user: { phone: null, phoneVerified: false, phoneOtpLastStatus: null },
      },
    });

    await expect(
      service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: PARTNER_ID,
      }),
    ).rejects.toMatchObject({
      response: {
        gaps: ['BRAND_NAME_MISSING', 'PHONE_NOT_VERIFIED'],
      },
    });

    // Refused before any code lookup, so an incomplete brand cannot probe
    // which partner IDs exist.
    expect(prisma.agency.findUnique).not.toHaveBeenCalled();
  });

  it('lets an unverified brand through when OTP is disabled platform-wide', async () => {
    const { service } = build({
      otpEnabled: false,
      brand: {
        ...completeBrand,
        user: { phone: null, phoneVerified: false, phoneOtpLastStatus: null },
      },
    });

    await expect(
      service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: PARTNER_ID,
      }),
    ).resolves.toMatchObject({ status: AgencyBrandLinkStatus.PENDING });
  });

  it('answers the same way for an unknown code and a malformed one', async () => {
    // Both 404, so the endpoint cannot be used to discover valid codes.
    const unknown = build({ agencyByPartnerId: null });
    await expect(
      unknown.service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: 'GC-AAAA-BBBB',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const malformed = build();
    await expect(
      malformed.service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: 'not-a-code',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an agency owner linking their own agency to their own brand', async () => {
    const { service } = build({
      agencyByPartnerId: {
        id: AGENCY_ID,
        name: 'Best Agency',
        ownerUserId: BRAND_USER,
      },
    });

    await expect(
      service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: PARTNER_ID,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([AgencyBrandLinkStatus.ACTIVE, AgencyBrandLinkStatus.PENDING])(
    'rejects a duplicate request when one is %s',
    async (status) => {
      const { service } = build({
        existingLink: { id: 'link-1', status },
      });

      await expect(
        service.requestLink({
          brandUserId: BRAND_USER,
          rawPartnerId: PARTNER_ID,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it.each([AgencyBrandLinkStatus.REJECTED, AgencyBrandLinkStatus.REVOKED])(
    'reopens a %s relationship by reusing the same row',
    async (status) => {
      const { service, prisma } = build({
        existingLink: { id: 'link-1', status },
      });

      await service.requestLink({
        brandUserId: BRAND_USER,
        rawPartnerId: PARTNER_ID,
      });

      expect(prisma.agencyBrandLink.create).not.toHaveBeenCalled();
      expect(prisma.agencyBrandLink.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'link-1' },
          data: containing({
            status: AgencyBrandLinkStatus.PENDING,
            // The previous outcome is cleared, so a reopened row cannot be
            // mistaken for one that is still revoked.
            revokedAt: null,
            revokedByUserId: null,
            respondedAt: null,
          }),
        }),
      );
    },
  );
});

describe('AgencyBrandLinkService.acceptLink — the agency approves', () => {
  it('turns a pending request into access', async () => {
    const { service, prisma } = build();

    await service.acceptLink({ agencyUserId: AGENCY_USER, linkId: 'link-1' });

    expect(prisma.agencyBrandLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: containing({
          status: AgencyBrandLinkStatus.ACTIVE,
          respondedByUserId: AGENCY_USER,
        }),
      }),
    );
  });

  it('re-checks completeness, closing the gap between request and accept', async () => {
    const { service } = build({
      brand: { ...completeBrand, contactPhone: null },
    });

    await expect(
      service.acceptLink({ agencyUserId: AGENCY_USER, linkId: 'link-1' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it.each([
    AgencyBrandLinkStatus.ACTIVE,
    AgencyBrandLinkStatus.REJECTED,
    AgencyBrandLinkStatus.REVOKED,
  ])('refuses to accept a link that is %s', async (status) => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status,
        agencyId: AGENCY_ID,
        brandId: BRAND_ID,
      },
    });

    await expect(
      service.acceptLink({ agencyUserId: AGENCY_USER, linkId: 'link-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('refuses a link belonging to a different agency', async () => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.PENDING,
        agencyId: 'someone-else',
        brandId: BRAND_ID,
      },
    });

    await expect(
      service.acceptLink({ agencyUserId: AGENCY_USER, linkId: 'link-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AgencyBrandLinkService.revokeLink — ending it', () => {
  it('lets the brand revoke its own link', async () => {
    const { service, prisma } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.ACTIVE,
        agency: { ownerUserId: AGENCY_USER },
        brand: { userId: BRAND_USER },
      },
    });

    await service.revokeLink({
      linkId: 'link-1',
      actorUserId: BRAND_USER,
      actor: 'BRAND',
      reason: 'Engagement ended',
    });

    expect(prisma.agencyBrandLink.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: containing({
          status: AgencyBrandLinkStatus.REVOKED,
          revokedReason: 'Engagement ended',
        }),
      }),
    );
  });

  it('lets the agency walk away', async () => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.ACTIVE,
        agency: { ownerUserId: AGENCY_USER },
        brand: { userId: BRAND_USER },
      },
    });

    await expect(
      service.revokeLink({
        linkId: 'link-1',
        actorUserId: AGENCY_USER,
        actor: 'AGENCY',
      }),
    ).resolves.toEqual({ linkId: 'link-1' });
  });

  it('refuses a brand revoking a link that is not theirs', async () => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.ACTIVE,
        agency: { ownerUserId: AGENCY_USER },
        brand: { userId: 'another-brand-user' },
      },
    });

    await expect(
      service.revokeLink({
        linkId: 'link-1',
        actorUserId: BRAND_USER,
        actor: 'BRAND',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an agency revoking a link that is not theirs', async () => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.ACTIVE,
        agency: { ownerUserId: 'another-agency-user' },
        brand: { userId: BRAND_USER },
      },
    });

    await expect(
      service.revokeLink({
        linkId: 'link-1',
        actorUserId: AGENCY_USER,
        actor: 'AGENCY',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets an admin force-unlink either side', async () => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.ACTIVE,
        agency: { ownerUserId: AGENCY_USER },
        brand: { userId: BRAND_USER },
      },
    });

    await expect(
      service.revokeLink({
        linkId: 'link-1',
        actorUserId: 'admin-user',
        actor: 'ADMIN',
        reason: 'Support request',
      }),
    ).resolves.toEqual({ linkId: 'link-1' });
  });

  it('refuses to revoke an already-revoked link', async () => {
    const { service } = build({
      linkById: {
        id: 'link-1',
        status: AgencyBrandLinkStatus.REVOKED,
        agency: { ownerUserId: AGENCY_USER },
        brand: { userId: BRAND_USER },
      },
    });

    await expect(
      service.revokeLink({
        linkId: 'link-1',
        actorUserId: BRAND_USER,
        actor: 'BRAND',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AgencyBrandLinkService.spendReport', () => {
  it('refuses an agency that does not manage the brand', async () => {
    const { service } = build({
      existingLink: { id: 'link-1', status: AgencyBrandLinkStatus.REVOKED },
    });

    await expect(
      service.spendReport({ agencyUserId: AGENCY_USER, brandId: BRAND_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('splits wallet credit from what was actually charged', async () => {
    const { service, prisma } = build({
      existingLink: { id: 'link-1', status: AgencyBrandLinkStatus.ACTIVE },
    });
    prisma.order.findMany.mockResolvedValueOnce([
      { expectedAmountPaise: 10_000, creditsAppliedPaise: 4_000 },
      { expectedAmountPaise: 5_000, creditsAppliedPaise: 0 },
    ] as never);

    const report = await service.spendReport({
      agencyUserId: AGENCY_USER,
      brandId: BRAND_ID,
    });

    expect(report.orderCount).toBe(2);
    expect(report.chargedPaise).toBe(15_000);
    expect(report.creditsAppliedPaise).toBe(4_000);
  });

  it('only counts orders this agency placed', async () => {
    const { service, prisma } = build({
      existingLink: { id: 'link-1', status: AgencyBrandLinkStatus.ACTIVE },
    });

    await service.spendReport({ agencyUserId: AGENCY_USER, brandId: BRAND_ID });

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { brandId: BRAND_ID, placedByAgencyId: AGENCY_ID },
      }),
    );
  });
});
