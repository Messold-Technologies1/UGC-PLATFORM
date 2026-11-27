import {
  ApprovalStatus,
  OrderStatus,
  SocialConnectionStatus,
} from '@prisma/client';
import type { EventContext } from './define-events';
import { NOTIFICATION_EVENTS_BY_KEY } from './event-catalog';

/**
 * What each delayed send asks before it goes out.
 *
 * Only consulted for rows with an offset — an immediate send never reaches it —
 * so these cases are exactly the "a day later, is this still true?" question.
 * Worth pinning per event because both ways of being wrong are silent: a nudge
 * that keeps firing tells someone to do what they already did, and a notice
 * wrongly gated just never arrives.
 */

function ctxWithOrder(status: OrderStatus | null): EventContext {
  return {
    prisma: {
      order: {
        findUnique: jest.fn().mockResolvedValue(status ? { status } : null),
      },
    },
  } as unknown as EventContext;
}

const relevant = (key: string, ctx: EventContext, id = 'ord_1') =>
  NOTIFICATION_EVENTS_BY_KEY[key].stillRelevant!(ctx, id);

describe('stillRelevant', () => {
  describe('order nudges stop once the other side acts', () => {
    const cases: Array<{
      key: string;
      whileWaiting: OrderStatus;
      onceActed: OrderStatus;
    }> = [
      {
        key: 'order-brief-submitted-for-creator',
        whileWaiting: OrderStatus.BRIEF_SUBMITTED,
        onceActed: OrderStatus.BRIEF_ACCEPTED,
      },
      {
        key: 'order-brief-accepted-for-brand',
        whileWaiting: OrderStatus.BRIEF_ACCEPTED,
        onceActed: OrderStatus.PRODUCT_SHIPPED,
      },
      {
        key: 'order-product-shipped-for-creator',
        whileWaiting: OrderStatus.PRODUCT_SHIPPED,
        onceActed: OrderStatus.PRODUCT_RECEIVED,
      },
      {
        key: 'order-revision-requested-for-creator',
        whileWaiting: OrderStatus.REVISION_REQUESTED,
        onceActed: OrderStatus.REVISION_SUBMITTED,
      },
      {
        key: 'order-content-delivered-for-brand',
        whileWaiting: OrderStatus.DELIVERED,
        onceActed: OrderStatus.ACCEPTED,
      },
      {
        key: 'order-dispute-opened-for-brand',
        whileWaiting: OrderStatus.DISPUTED,
        onceActed: OrderStatus.ACCEPTED,
      },
      {
        key: 'order-dispute-opened-for-creator',
        whileWaiting: OrderStatus.DISPUTED,
        onceActed: OrderStatus.ACCEPTED,
      },
    ];

    it.each(cases)('$key', async ({ key, whileWaiting, onceActed }) => {
      await expect(relevant(key, ctxWithOrder(whileWaiting))).resolves.toBe(
        true,
      );
      await expect(relevant(key, ctxWithOrder(onceActed))).resolves.toBe(false);
    });

    it.each(cases)(
      '$key answers null — not false — when the order is gone',
      async ({ key }) => {
        // false means "they already acted" and null means "I cannot see it".
        // Folding the second into the first is what let a worker on the wrong
        // database look like healthy restraint in the delivery log.
        await expect(relevant(key, ctxWithOrder(null))).resolves.toBeNull();
      },
    );
  });

  it('keeps nudging a brand that asked for a revision and got one back', async () => {
    // REVISION_SUBMITTED still awaits the brand, so the review nudge stands.
    await expect(
      relevant(
        'order-content-delivered-for-brand',
        ctxWithOrder(OrderStatus.REVISION_SUBMITTED),
      ),
    ).resolves.toBe(true);
  });

  describe('social-connection-expired', () => {
    // Read through the profile, so "no expired connection left" and "no such
    // creator" are distinguishable — a plain connection query returns an empty
    // result for both.
    const ctx = (
      profile: { socialConnections: Array<{ id: string }> } | null,
    ): EventContext =>
      ({
        prisma: {
          creatorProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
        },
      }) as unknown as EventContext;

    it('keeps asking while a connection is not ACTIVE', async () => {
      await expect(
        relevant(
          'social-connection-expired',
          ctx({ socialConnections: [{ id: 'c1' }] }),
          'creator_1',
        ),
      ).resolves.toBe(true);
    });

    it('stops once the creator reconnects', async () => {
      await expect(
        relevant(
          'social-connection-expired',
          ctx({ socialConnections: [] }),
          'creator_1',
        ),
      ).resolves.toBe(false);
    });

    it('answers null when the creator is gone', async () => {
      await expect(
        relevant('social-connection-expired', ctx(null), 'creator_1'),
      ).resolves.toBeNull();
    });

    it('asks only about connections that are not ACTIVE', async () => {
      const findUnique = jest.fn().mockResolvedValue({ socialConnections: [] });
      await relevant(
        'social-connection-expired',
        {
          prisma: { creatorProfile: { findUnique } },
        } as unknown as EventContext,
        'creator_1',
      );
      expect(findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            socialConnections: expect.objectContaining({
              where: { status: { not: SocialConnectionStatus.ACTIVE } },
            }) as unknown,
          }) as unknown,
        }),
      );
    });
  });

  describe('brand-wishlist-no-order', () => {
    // Stops once the brand PAYS for an order (paidAt set), or has emptied its
    // wishlist. A missing brand answers null, not false.
    const ctx = (opts: {
      brandExists: boolean;
      paidOrders: number;
      savedCreators: number;
    }): EventContext =>
      ({
        prisma: {
          brandProfile: {
            findUnique: jest
              .fn()
              .mockResolvedValue(opts.brandExists ? { id: 'brand_1' } : null),
          },
          order: {
            count: jest.fn().mockResolvedValue(opts.paidOrders),
          },
          brandWishlistCreator: {
            count: jest.fn().mockResolvedValue(opts.savedCreators),
          },
        },
      }) as unknown as EventContext;

    const ask = (c: EventContext) =>
      relevant('brand-wishlist-no-order', c, 'brand_1');

    it('keeps nudging a brand with saved creators and no paid order', async () => {
      await expect(
        ask(ctx({ brandExists: true, paidOrders: 0, savedCreators: 3 })),
      ).resolves.toBe(true);
    });

    it('stops once the brand pays for an order', async () => {
      await expect(
        ask(ctx({ brandExists: true, paidOrders: 1, savedCreators: 3 })),
      ).resolves.toBe(false);
    });

    it('stops when the wishlist has been emptied', async () => {
      await expect(
        ask(ctx({ brandExists: true, paidOrders: 0, savedCreators: 0 })),
      ).resolves.toBe(false);
    });

    it('answers null — not false — when the brand is gone', async () => {
      await expect(
        ask(ctx({ brandExists: false, paidOrders: 0, savedCreators: 0 })),
      ).resolves.toBeNull();
    });

    it('counts only paid orders, not abandoned unpaid ones', async () => {
      const c = ctx({ brandExists: true, paidOrders: 0, savedCreators: 1 });
      await ask(c);
      const count = (c.prisma.order as unknown as { count: jest.Mock }).count;
      expect(count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            brandId: 'brand_1',
            paidAt: { not: null },
          }) as unknown,
        }),
      );
    });
  });

  describe('brand-never-ordered', () => {
    // Stops once the brand pays for an order, OR once they save a creator (a
    // wishlist makes them 'warm' and the wishlist drip takes over). null when
    // the brand is gone.
    const ctx = (opts: {
      brandExists: boolean;
      paidOrders: number;
      savedCreators: number;
    }): EventContext =>
      ({
        prisma: {
          brandProfile: {
            findUnique: jest
              .fn()
              .mockResolvedValue(opts.brandExists ? { id: 'brand_1' } : null),
          },
          order: { count: jest.fn().mockResolvedValue(opts.paidOrders) },
          brandWishlistCreator: {
            count: jest.fn().mockResolvedValue(opts.savedCreators),
          },
        },
      }) as unknown as EventContext;

    const ask = (c: EventContext) =>
      relevant('brand-never-ordered', c, 'brand_1');

    it('keeps nudging a cold brand — no order, no saved creators', async () => {
      await expect(
        ask(ctx({ brandExists: true, paidOrders: 0, savedCreators: 0 })),
      ).resolves.toBe(true);
    });

    it('stops once the brand pays for an order', async () => {
      await expect(
        ask(ctx({ brandExists: true, paidOrders: 1, savedCreators: 0 })),
      ).resolves.toBe(false);
    });

    it('hands off to the wishlist drip once the brand saves a creator', async () => {
      await expect(
        ask(ctx({ brandExists: true, paidOrders: 0, savedCreators: 2 })),
      ).resolves.toBe(false);
    });

    it('answers null — not false — when the brand is gone', async () => {
      await expect(
        ask(ctx({ brandExists: false, paidOrders: 0, savedCreators: 0 })),
      ).resolves.toBeNull();
    });
  });

  describe('brand-no-recent-order', () => {
    // Wins back a lapsed paying brand. Stops once they pay again (any paid order
    // in the last 30 days); null when the brand is gone.
    const ctx = (opts: {
      brandExists: boolean;
      recentPaid: number;
      everPaid: number;
    }): EventContext =>
      ({
        prisma: {
          brandProfile: {
            findUnique: jest
              .fn()
              .mockResolvedValue(opts.brandExists ? { id: 'brand_1' } : null),
          },
          order: {
            // First count() is the last-30-days query, second is ever-paid.
            count: jest
              .fn()
              .mockResolvedValueOnce(opts.recentPaid)
              .mockResolvedValueOnce(opts.everPaid),
          },
        },
      }) as unknown as EventContext;

    const ask = (c: EventContext) =>
      relevant('brand-no-recent-order', c, 'brand_1');

    it('keeps nudging a brand that ordered before but not in 30 days', async () => {
      await expect(
        ask(ctx({ brandExists: true, recentPaid: 0, everPaid: 2 })),
      ).resolves.toBe(true);
    });

    it('stops once the brand pays again within 30 days', async () => {
      await expect(
        ask(ctx({ brandExists: true, recentPaid: 1, everPaid: 3 })),
      ).resolves.toBe(false);
    });

    it('does not win back a brand that never paid for anything', async () => {
      await expect(
        ask(ctx({ brandExists: true, recentPaid: 0, everPaid: 0 })),
      ).resolves.toBe(false);
    });

    it('answers null — not false — when the brand is gone', async () => {
      await expect(
        ask(ctx({ brandExists: false, recentPaid: 0, everPaid: 0 })),
      ).resolves.toBeNull();
    });
  });

  describe('creator-profile-under-review', () => {
    // Relevant only while the profile is complete AND still awaiting approval
    // (PENDING or SELF_COMPLETED). null when the creator is gone.
    const ctx = (
      profile: {
        completeProfile: boolean;
        creatorApproval: { status: ApprovalStatus } | null;
      } | null,
    ): EventContext =>
      ({
        prisma: {
          creatorProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
        },
      }) as unknown as EventContext;

    const ask = (c: EventContext) =>
      relevant('creator-profile-under-review', c, 'creator_1');

    it('keeps reassuring while complete and PENDING', async () => {
      await expect(
        ask(
          ctx({
            completeProfile: true,
            creatorApproval: { status: ApprovalStatus.PENDING },
          }),
        ),
      ).resolves.toBe(true);
    });

    it('keeps reassuring while complete and SELF_COMPLETED', async () => {
      await expect(
        ask(
          ctx({
            completeProfile: true,
            creatorApproval: { status: ApprovalStatus.SELF_COMPLETED },
          }),
        ),
      ).resolves.toBe(true);
    });

    it('stops once the profile is approved', async () => {
      await expect(
        ask(
          ctx({
            completeProfile: true,
            creatorApproval: { status: ApprovalStatus.APPROVED },
          }),
        ),
      ).resolves.toBe(false);
    });

    it('stops once the profile is rejected', async () => {
      await expect(
        ask(
          ctx({
            completeProfile: true,
            creatorApproval: { status: ApprovalStatus.REJECTED },
          }),
        ),
      ).resolves.toBe(false);
    });

    it('answers null — not false — when the creator is gone', async () => {
      await expect(ask(ctx(null))).resolves.toBeNull();
    });
  });

  describe('creator-no-first-order', () => {
    // Relevant while the creator is listed AND has received no paid order; a
    // first booking or falling off the listing ends it; null when gone.
    const ctx = (opts: {
      profile: { isListed: boolean } | null;
      receivedPaid: number;
    }): EventContext =>
      ({
        prisma: {
          creatorProfile: {
            findUnique: jest.fn().mockResolvedValue(opts.profile),
          },
          order: { count: jest.fn().mockResolvedValue(opts.receivedPaid) },
        },
      }) as unknown as EventContext;

    const ask = (c: EventContext) =>
      relevant('creator-no-first-order', c, 'creator_1');

    it('keeps nudging a listed creator with no paid order', async () => {
      await expect(
        ask(ctx({ profile: { isListed: true }, receivedPaid: 0 })),
      ).resolves.toBe(true);
    });

    it('stops once the creator receives a paid order', async () => {
      await expect(
        ask(ctx({ profile: { isListed: true }, receivedPaid: 1 })),
      ).resolves.toBe(false);
    });

    it('stops when the creator is no longer listed', async () => {
      await expect(
        ask(ctx({ profile: { isListed: false }, receivedPaid: 0 })),
      ).resolves.toBe(false);
    });

    it('answers null — not false — when the creator is gone', async () => {
      await expect(
        ask(ctx({ profile: null, receivedPaid: 0 })),
      ).resolves.toBeNull();
    });
  });

  describe('creator-no-profile-events', () => {
    // Relevant while the creator is listed (live to brands) and has posted no
    // updates; posting the first ends it; null when the creator is gone.
    const ctx = (
      profile: { isListed: boolean; _count: { events: number } } | null,
    ): EventContext =>
      ({
        prisma: {
          creatorProfile: { findUnique: jest.fn().mockResolvedValue(profile) },
        },
      }) as unknown as EventContext;

    const ask = (c: EventContext) =>
      relevant('creator-no-profile-events', c, 'creator_1');

    it('keeps nudging a listed creator with no posts', async () => {
      await expect(
        ask(ctx({ isListed: true, _count: { events: 0 } })),
      ).resolves.toBe(true);
    });

    it('stops once the creator has posted an update', async () => {
      await expect(
        ask(ctx({ isListed: true, _count: { events: 2 } })),
      ).resolves.toBe(false);
    });

    it('does not nudge a creator who is not listed yet', async () => {
      await expect(
        ask(ctx({ isListed: false, _count: { events: 0 } })),
      ).resolves.toBe(false);
    });

    it('answers null — not false — when the creator is gone', async () => {
      await expect(ask(ctx(null))).resolves.toBeNull();
    });
  });

  describe('notices', () => {
    // A record of something that happened is still true a day later, so these
    // answer yes without reading anything — no query, no entity lookup.
    const noticeKeys = [
      'order-completed-for-brand',
      'order-refunded-for-brand',
      'order-dispute-resolved-for-brand',
      'creator-profile-approved',
      'brand-welcome',
    ];

    it.each(noticeKeys)('%s stays relevant', async (key) => {
      const prisma = { order: { findUnique: jest.fn() } };
      await expect(
        relevant(key, { prisma } as unknown as EventContext),
      ).resolves.toBe(true);
      expect(prisma.order.findUnique).not.toHaveBeenCalled();
    });
  });
});
