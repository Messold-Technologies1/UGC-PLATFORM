import { OrdersService } from './orders.service';

/**
 * Closing superseded checkout drafts. When a brand starts a newer checkout for
 * the same creator, the older PENDING_PAYMENT drafts are closed so the brand
 * can't pay a stale Razorpay link. Two things must hold:
 *
 *  - bulk-checkout children are never touched (their batch is paid as ONE
 *    Razorpay order whose total doesn't shrink when a child is rejected, so
 *    sweeping one charges the brand for an order they never receive);
 *  - the closed drafts carry a reason, because no human rejected them and an
 *    admin seeing REJECTED must not mistake one for a cancelled purchase.
 */
describe('OrdersService: superseded checkout drafts', () => {
  function makeService(others: Array<Record<string, unknown>>) {
    const updateMany = jest.fn().mockResolvedValue({ count: others.length });
    const findMany = jest.fn().mockResolvedValue(others);
    const prisma: any = {
      order: { findMany, updateMany },
      $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const wallet = {
      releaseCheckoutReservation: jest
        .fn()
        .mockResolvedValue({ balanceAfterPaise: 0 }),
    };
    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      wallet as never,
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // notification events
    );
    return { service, findMany, updateMany, wallet };
  }

  function sweep(service: OrdersService, sessionKey: string | null = 'key-1') {
    return (
      service as unknown as {
        rejectOtherPendingOrdersForBrandCreator: (
          owner: { brandId?: string | null; agencyId?: string | null },
          creatorId: string,
          keepOrderId: string,
          checkoutSessionKey: string | null,
        ) => Promise<void>;
      }
    ).rejectOtherPendingOrdersForBrandCreator(
      { brandId: 'brand-1', agencyId: null },
      'creator-1',
      'keep-1',
      sessionKey,
    );
  }

  it('never selects bulk-checkout children', async () => {
    const { service, findMany } = makeService([]);

    await sweep(service);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          brandId: 'brand-1',
          creatorId: 'creator-1',
          status: 'PENDING_PAYMENT',
          // The guard: a child of an OrderCheckoutBatch is off limits.
          checkoutBatchId: null,
          checkoutSessionKey: 'key-1',
          NOT: { id: 'keep-1' },
        }),
      }),
    );
  });

  it('records why the draft was closed and when', async () => {
    const { service, updateMany } = makeService([
      { id: 'stale-1', creditsAppliedPaise: 0 },
    ]);

    await sweep(service);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['stale-1'] } },
        data: expect.objectContaining({
          status: 'REJECTED',
          creditsAppliedPaise: 0,
          cancelledAt: expect.any(Date),
          cancellationReason: expect.stringContaining('never charged'),
        }),
      }),
    );
  });

  it('returns reserved store credit before closing a draft that held some', async () => {
    const { service, wallet } = makeService([
      { id: 'stale-1', creditsAppliedPaise: 25000 },
    ]);

    await sweep(service);

    expect(wallet.releaseCheckoutReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        orderId: 'stale-1',
        amountPaise: 25000,
      }),
      expect.anything(),
    );
  });

  it('does nothing when there is no other draft to close', async () => {
    const { service, updateMany, wallet } = makeService([]);

    await sweep(service);

    expect(updateMany).not.toHaveBeenCalled();
    expect(wallet.releaseCheckoutReservation).not.toHaveBeenCalled();
  });

  it('only closes drafts from the SAME checkout attempt', async () => {
    // A brand deliberately ordering a second video from this creator gets a new
    // attempt key, so their earlier draft must not be in scope. Before the key
    // existed, that second checkout rejected the first order.
    const { service, findMany } = makeService([]);

    await sweep(service, 'attempt-b');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ checkoutSessionKey: 'attempt-b' }),
      }),
    );
  });

  it('a keyless request reaches only other keyless drafts', async () => {
    // Backwards compatibility: a client that predates the key keeps the old
    // behaviour among keyless drafts, and never reaches into a keyed attempt.
    const { service, findMany } = makeService([]);

    await sweep(service, null);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ checkoutSessionKey: null }),
      }),
    );
  });
});
