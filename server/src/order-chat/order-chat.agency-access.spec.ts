import { ForbiddenException } from '@nestjs/common';
import { OrderChatService } from './order-chat.service';

/**
 * Who may read and write an order's chat once an agency manages the brand.
 *
 * The important property is that access is decided from the LIVE link, so
 * revoking drops the agency out of a conversation that is already in flight —
 * it does not wait for a new session.
 */

const BRAND_ID = 'brand-1';
const BRAND_USER = 'brand-user-1';
const CREATOR_USER = 'creator-user-1';
const AGENCY_USER = 'agency-user-1';
const ORDER_ID = 'order-1';

function build(opts: { agencyLinked?: boolean } = {}) {
  const prisma = {
    order: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          briefAcceptedAt: new Date(),
          brandId: BRAND_ID,
          agencyId: null,
          brand: { id: BRAND_ID },
          creator: { userId: CREATOR_USER },
        }),
      ),
    },
  };

  const brandAccess = {
    resolveBuyerActorUserId: jest.fn(() => Promise.resolve(BRAND_USER)),
    isLinkedAgencyUserForBrand: jest.fn((userId: string) =>
      Promise.resolve(Boolean(opts.agencyLinked) && userId === AGENCY_USER),
    ),
  };

  const service = new OrderChatService(
    prisma as never,
    {} as never,
    {} as never,
    brandAccess as never,
    { emit: jest.fn() } as never,
  );

  return { service, brandAccess };
}

describe('OrderChatService — agency access to a managed brand’s chat', () => {
  it('lets the brand owner in', async () => {
    const { service } = build();
    await expect(
      service.assertOrderChatAccess({
        orderId: ORDER_ID,
        viewerUserId: BRAND_USER,
      }),
    ).resolves.toMatchObject({ brandId: BRAND_ID });
  });

  it('lets the creator in', async () => {
    const { service } = build();
    await expect(
      service.assertOrderChatAccess({
        orderId: ORDER_ID,
        viewerUserId: CREATOR_USER,
      }),
    ).resolves.toBeTruthy();
  });

  it('lets an agency with a live link join the brand’s side', async () => {
    const { service } = build({ agencyLinked: true });
    await expect(
      service.assertOrderChatAccess({
        orderId: ORDER_ID,
        viewerUserId: AGENCY_USER,
      }),
    ).resolves.toBeTruthy();
  });

  it('shuts an agency out the moment its link stops being active', async () => {
    // Same order, same agency, link no longer ACTIVE — the revocation case.
    const { service } = build({ agencyLinked: false });
    await expect(
      service.assertOrderChatAccess({
        orderId: ORDER_ID,
        viewerUserId: AGENCY_USER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an unrelated user', async () => {
    const { service } = build({ agencyLinked: true });
    await expect(
      service.assertOrderChatAccess({
        orderId: ORDER_ID,
        viewerUserId: 'stranger',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('checks the link against the order’s own brand', async () => {
    const { service, brandAccess } = build({ agencyLinked: true });

    await service.assertOrderChatAccess({
      orderId: ORDER_ID,
      viewerUserId: AGENCY_USER,
    });

    expect(brandAccess.isLinkedAgencyUserForBrand).toHaveBeenCalledWith(
      AGENCY_USER,
      BRAND_ID,
    );
  });

  it('does not consult the link for the brand owner or the creator', async () => {
    // Both are settled by identity, so the common path costs no extra queries.
    const { service, brandAccess } = build({ agencyLinked: true });

    await service.assertOrderChatAccess({
      orderId: ORDER_ID,
      viewerUserId: BRAND_USER,
    });
    await service.assertOrderChatAccess({
      orderId: ORDER_ID,
      viewerUserId: CREATOR_USER,
    });

    expect(brandAccess.isLinkedAgencyUserForBrand).not.toHaveBeenCalled();
  });
});
