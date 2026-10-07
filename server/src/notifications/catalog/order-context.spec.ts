import { NotificationRecipientRole, OrderStatus, Prisma } from '@prisma/client';
import { createBrandAccessMock } from '../../brand-access/brand-access.test-util';
import type { EventContext } from './define-events';
import { orderEvents } from './order.events';
import {
  brandDisplayName,
  brandOrderUrl,
  type OrderRow,
  toBrand,
} from './order-context';

/**
 * An order has exactly one buyer — a standalone brand or an agency — and both
 * columns are nullable. These cover the buyer side of that split: who gets
 * addressed, what they are called, and which workspace the link points at.
 */

const FRONTEND = 'https://app.example.com';

const creator = {
  id: 'creator-1',
  displayName: 'Ananya R',
  contactEmail: 'ananya@creators.example',
  user: {
    id: 'creator-user-1',
    email: 'ananya@account.example',
    name: 'Ananya Rao',
    phone: '+919000000001',
  },
};

const brand = {
  id: 'brand-1',
  brandName: 'Acme Beauty',
  contactEmail: 'team@acme.example',
  contactPhone: '+919000000002',
  contactFullName: 'Rohit S',
  userId: 'brand-user-1',
};

const agency = {
  id: 'agency-1',
  name: 'Northstar Media',
  contactEmail: 'hello@northstar.example',
  contactPhone: '+919000000003',
  contactFullName: 'Jane Doe',
  ownerUserId: 'agency-owner-1',
};

/** Every column `orderSelect` asks for, so any event's resolve() can run. */
function makeOrder(buyer: 'brand' | 'agency' | 'none'): OrderRow {
  return {
    id: 'ord_8f21c4',
    status: OrderStatus.ACCEPTED,
    packageNameSnapshot: 'Standard — 3 reels',
    priceAmountSnapshot: new Prisma.Decimal('4999'),
    currency: 'INR',
    revisionCount: 1,
    maxRevisionsSnapshot: 2,
    usageRightsExtraDays: 30,
    courierName: 'Bluedart',
    trackingId: 'BD123456',
    dispatchedAt: new Date('2026-10-01T06:30:00Z'),
    deliveryDueAt: new Date('2026-10-05T12:30:00Z'),
    deliveredAt: new Date('2026-10-04T09:00:00Z'),
    briefSubmittedAt: new Date('2026-09-30T05:00:00Z'),
    briefAcceptedAt: new Date('2026-09-30T07:00:00Z'),
    cancellationReason: 'Changed our mind',
    cancelledAt: new Date('2026-10-02T05:00:00Z'),
    refundedAt: new Date('2026-10-03T05:00:00Z'),
    brand: buyer === 'brand' ? brand : null,
    agency: buyer === 'agency' ? agency : null,
    creator,
  } as unknown as OrderRow;
}

function makeBrandAccess() {
  return createBrandAccessMock({ brandActorUserId: 'brand-user-1' });
}

function makeContext(
  order: OrderRow,
  brandAccess: ReturnType<typeof makeBrandAccess> = makeBrandAccess(),
): EventContext {
  const users: Record<string, unknown> = {
    'agency-owner-1': {
      id: 'agency-owner-1',
      email: 'owner@northstar.example',
      name: 'Jane Owner',
      phone: '+919000000004',
    },
    'brand-user-1': {
      id: 'brand-user-1',
      email: 'rohit@acme.example',
      name: 'Rohit Sharma',
      phone: '+919000000005',
    },
  };

  return {
    prisma: {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      user: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(users[where.id] ?? null),
        ),
      },
      // Side rows a few events read for their extra vars. Present so every
      // resolve() runs to completion; their contents are not what is asserted.
      orderDelivery: {
        findFirst: jest.fn().mockResolvedValue({ note: 'Files attached' }),
      },
      orderRevision: {
        findFirst: jest.fn().mockResolvedValue({
          revisionNumber: 1,
          createdAt: new Date('2026-10-02T10:00:00Z'),
        }),
      },
      orderRevisionPurchase: {
        findFirst: jest.fn().mockResolvedValue({ revisionsAdded: 2 }),
      },
      orderUsageRightsPurchase: {
        findFirst: jest.fn().mockResolvedValue({ daysAdded: 30 }),
      },
      orderDispute: {
        findFirst: jest.fn().mockResolvedValue({
          openedBy: 'BRAND',
          reason: 'Content does not match the brief',
          resolutionNotes: 'Resolved without a refund',
        }),
      },
    },
    brandAccess,
    frontendBaseUrl: FRONTEND,
    config: { get: jest.fn() },
  } as unknown as EventContext;
}

describe('order-context buyer resolution', () => {
  describe('brandOrderUrl', () => {
    it('points an agency order at the agency workspace', () => {
      const order = makeOrder('agency');
      expect(brandOrderUrl(makeContext(order), order)).toBe(
        `${FRONTEND}/agency/orders/ord_8f21c4`,
      );
    });

    it('points a standalone brand order at the brand workspace', () => {
      const order = makeOrder('brand');
      expect(brandOrderUrl(makeContext(order), order)).toBe(
        `${FRONTEND}/brand/orders/ord_8f21c4`,
      );
    });
  });

  describe('brandDisplayName', () => {
    it('uses the agency name, never the brand behind it', () => {
      expect(brandDisplayName(makeOrder('agency'))).toBe('Northstar Media');
    });

    it('uses the brand contact name for a standalone brand', () => {
      expect(brandDisplayName(makeOrder('brand'))).toBe('Rohit S');
    });

    it('falls back when the order has no buyer', () => {
      expect(brandDisplayName(makeOrder('none'))).toBe('Brand');
    });
  });

  describe('toBrand', () => {
    it('addresses the agency owner and gates on the agency', async () => {
      const order = makeOrder('agency');
      const recipient = await toBrand(makeContext(order), order, {});

      expect(recipient).toMatchObject({
        userId: 'agency-owner-1',
        profileType: 'agency',
        profileId: 'agency-1',
        email: 'hello@northstar.example',
        phone: '+919000000003',
      });
      expect(recipient.vars.recipientName).toBe('Jane Doe');
    });

    it('falls back to the agency owner account when the agency has no contact phone', async () => {
      const order = makeOrder('agency');
      (order.agency as { contactPhone: string | null }).contactPhone = null;

      const recipient = await toBrand(makeContext(order), order, {});
      expect(recipient.phone).toBe('+919000000004');
    });

    it('resolves a standalone brand through BrandAccessService', async () => {
      const order = makeOrder('brand');
      const brandAccess = makeBrandAccess();
      const recipient = await toBrand(
        makeContext(order, brandAccess),
        order,
        {},
      );

      expect(
        brandAccess.resolveBrandActorUserIdForProfile,
      ).toHaveBeenCalledWith('brand-1');
      expect(recipient).toMatchObject({
        userId: 'brand-user-1',
        profileType: 'brand',
        profileId: 'brand-1',
        email: 'team@acme.example',
      });
    });

    it('addresses nobody when the row has neither buyer, so the step skips it', async () => {
      const order = makeOrder('none');
      const recipient = await toBrand(makeContext(order), order, {});

      // No address is what the step service turns into a `no_address` skip; a
      // profileType would instead send it down an opt-in lookup that cannot hit.
      expect(recipient.email).toBeNull();
      expect(recipient.phone).toBeNull();
      expect(recipient.profileType).toBeUndefined();
    });
  });

  /**
   * The link was wrong on all thirteen buyer events at once, because each built
   * it separately. Asserting over the catalog is what stops the fourteenth from
   * reintroducing it.
   */
  describe('every buyer event', () => {
    const buyerEvents = Object.entries(orderEvents).filter(
      ([, def]) => def.recipient === NotificationRecipientRole.BRAND,
    );

    it('covers all of them', () => {
      expect(buyerEvents).toHaveLength(13);
    });

    it.each(buyerEvents)(
      '%s links an agency order to /agency',
      async (_key, def) => {
        const order = makeOrder('agency');
        const recipient = await def.resolve(makeContext(order), order.id);

        expect(recipient?.vars.actionUrl).toBe(
          `${FRONTEND}/agency/orders/ord_8f21c4`,
        );
        expect(recipient?.profileType).toBe('agency');
      },
    );

    it.each(buyerEvents)(
      '%s links a brand order to /brand',
      async (_key, def) => {
        const order = makeOrder('brand');
        const recipient = await def.resolve(makeContext(order), order.id);

        expect(recipient?.vars.actionUrl).toBe(
          `${FRONTEND}/brand/orders/ord_8f21c4`,
        );
        expect(recipient?.profileType).toBe('brand');
      },
    );
  });
});
