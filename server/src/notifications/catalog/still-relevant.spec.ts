import { OrderStatus, SocialConnectionStatus } from '@prisma/client';
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
