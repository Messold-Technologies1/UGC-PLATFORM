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
const AGENCY_EMAIL = 'hello@bestagency.com';

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
  /** The agency owning the email that was typed; null means no such agency. */
  agencyByEmail?: {
    id: string;
    name: string;
    ownerUserId: string;
  } | null;
  /** The user behind the typed email; null means no account at all. */
  ownerByEmail?: { id: string } | null;
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
    user: {
      findUnique: jest.fn(() =>
        Promise.resolve(
          opts.ownerByEmail === undefined
            ? { id: AGENCY_USER }
            : opts.ownerByEmail,
        ),
      ),
    },
    agency: {
      findUnique: jest.fn(() => {
        // requestLink resolves the agency from the owner it found by email;
        // the other callers look up the signed-in agency the same way, so the
        // fixture is chosen by which option the test set.
        if (opts.agencyByEmail !== undefined) {
          return Promise.resolve(opts.agencyByEmail);
        }
        return Promise.resolve(
          opts.agencyByOwner === undefined
            ? { id: AGENCY_ID, name: 'Best Agency', ownerUserId: AGENCY_USER }
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

  // Notifications are fire-and-forget and already swallow their own errors;
  // the assertions here are about the link lifecycle, not delivery.
  const notifications = { emit: jest.fn(() => Promise.resolve()) };

  return {
    service: new AgencyBrandLinkService(
      prisma as never,
      config as never,
      notifications as never,
    ),
    prisma,
    notifications,
  };
}

describe('AgencyBrandLinkService — the feature flag', () => {
  it('hides every route when the flag is off', async () => {
    const { service } = build({ flagEnabled: false });

    await expect(
      service.requestLink({
        brandUserId: BRAND_USER,
        rawAgencyEmail: AGENCY_EMAIL,
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

describe('AgencyBrandLinkService.requestLink — the brand names the agency', () => {
  it('creates a pending request and names the agency', async () => {
    const { service, prisma } = build();

    const result = await service.requestLink({
      brandUserId: BRAND_USER,
      rawAgencyEmail: AGENCY_EMAIL,
    });

    expect(result.status).toBe(AgencyBrandLinkStatus.PENDING);
    expect(result.agencyName).toBe('Best Agency');
    expect(prisma.agencyBrandLink.create).toHaveBeenCalled();
  });

  it('lowercases and trims the address before looking it up', async () => {
    // Signup stores addresses lowercased, so a brand given the address in
    // title case must still resolve.
    const { service, prisma } = build();

    await service.requestLink({
      brandUserId: BRAND_USER,
      rawAgencyEmail: '  Hello@BestAgency.com ',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: AGENCY_EMAIL } }),
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
        rawAgencyEmail: AGENCY_EMAIL,
      }),
    ).rejects.toMatchObject({
      response: {
        gaps: ['BRAND_NAME_MISSING', 'PHONE_NOT_VERIFIED'],
      },
    });

    // Refused before any lookup, so an incomplete brand cannot probe which
    // addresses belong to an agency.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
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
        rawAgencyEmail: AGENCY_EMAIL,
      }),
    ).resolves.toMatchObject({ status: AgencyBrandLinkStatus.PENDING });
  });

  it('answers the same way whether the account is missing or is not an agency', async () => {
    // Both 404, so the endpoint does not report which of the two it was.
    const noAccount = build({ ownerByEmail: null });
    await expect(
      noAccount.service.requestLink({
        brandUserId: BRAND_USER,
        rawAgencyEmail: 'nobody@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const notAnAgency = build({ agencyByEmail: null });
    await expect(
      notAnAgency.service.requestLink({
        brandUserId: BRAND_USER,
        rawAgencyEmail: 'a-creator@example.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const blank = build();
    await expect(
      blank.service.requestLink({
        brandUserId: BRAND_USER,
        rawAgencyEmail: '   ',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses an agency owner linking their own agency to their own brand', async () => {
    const { service } = build({
      agencyByEmail: {
        id: AGENCY_ID,
        name: 'Best Agency',
        ownerUserId: BRAND_USER,
      },
    });

    await expect(
      service.requestLink({
        brandUserId: BRAND_USER,
        rawAgencyEmail: AGENCY_EMAIL,
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
          rawAgencyEmail: AGENCY_EMAIL,
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
        rawAgencyEmail: AGENCY_EMAIL,
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

describe('AgencyBrandLinkService.isActingForAnotherBrand', () => {
  /**
   * The active-brand header lives in localStorage, which is per browser and
   * not per account. A brand signing in where an agency last worked carried
   * the agency's leftover workspace, and the brand-side routes refused it —
   * so their own page reported that their agency connections could not be
   * loaded. Owning the brand in the header is not acting for anyone.
   */
  it('is false when no workspace is being asked for', async () => {
    const { service, prisma } = build();
    await expect(
      service.isActingForAnotherBrand(BRAND_USER, null),
    ).resolves.toBe(false);
    // Nothing to check, so nothing is read.
    expect(prisma.brandProfile.findUnique).not.toHaveBeenCalled();
  });

  it("is false when the header names the caller's own brand", async () => {
    const { service } = build();
    await expect(
      service.isActingForAnotherBrand(BRAND_USER, BRAND_ID),
    ).resolves.toBe(false);
  });

  it("is true when the header names someone else's brand", async () => {
    const { service } = build();
    await expect(
      service.isActingForAnotherBrand(BRAND_USER, 'another-brand'),
    ).resolves.toBe(true);
  });

  it('is true when the caller owns no brand at all', async () => {
    // An agency switched into a brand: it has no brand profile of its own, so
    // every id in the header belongs to somebody else.
    const { service } = build({ brand: null });
    await expect(
      service.isActingForAnotherBrand(AGENCY_USER, BRAND_ID),
    ).resolves.toBe(true);
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
