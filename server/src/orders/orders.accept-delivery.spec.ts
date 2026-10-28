import { OrdersService } from './orders.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * Wiring test for the Brand Collab hook: accepting a delivery must kick off the
 * portfolio sync (fire-and-forget), and accepting an already-accepted order must
 * not.
 */
describe('OrdersService.acceptDelivery → portfolio sync', () => {
  function makeService(order: Record<string, unknown>) {
    // The acceptance is a conditional `updateMany`, not an `update` by id: the
    // preconditions live in the WHERE so concurrent callers serialise on the
    // row and exactly one of them sees count === 1.
    const orderUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const orderClient = {
      findUnique: jest.fn().mockResolvedValue(order),
      updateMany: orderUpdateMany,
      update: jest.fn().mockResolvedValue({}),
    };
    // Acceptance and its reward credit share one transaction, so the mock has
    // to hand the same order client to the callback.
    const prisma = {
      order: orderClient,
      $transaction: jest.fn(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          await fn({ order: orderClient }),
      ),
    };
    const brandAccess = createBrandAccessMock();
    const orderPortfolioSync = {
      syncAcceptedOrder: jest.fn().mockResolvedValue({ status: 'created' }),
    };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      brandAccess as never,
      {} as never,
      orderPortfolioSync as never,
      {} as never,
      {} as never, // wallet
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // notification events
      { get: () => undefined } as never, // config
      { enabledFor: () => false, sendEvent: jest.fn() } as never, // meta capi: off, so the Purchase event stays out of these tests
    );
    return { service, orderUpdateMany, orderPortfolioSync };
  }

  const deliveredOrder = {
    id: 'order-1',
    brandId: 'brand-1',
    status: 'DELIVERED',
    acceptedAt: null,
    lastChatMessageId: null,
  };

  it('marks the order accepted and triggers the portfolio sync', async () => {
    const { service, orderUpdateMany, orderPortfolioSync } =
      makeService(deliveredOrder);

    await service.acceptDelivery({
      actorUserId: 'user-1',
      brandProfileId: 'brand-1',
      orderId: 'order-1',
    });

    // Order moved to ACCEPTED, attributed to the brand that clicked.
    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'order-1', acceptedAt: null }),
        data: expect.objectContaining({
          status: 'ACCEPTED',
          acceptedBy: 'BRAND',
          // The clock has done its job; leaving it set would keep the order in
          // the sweep's result set forever.
          autoAcceptAt: null,
        }),
      }),
    );
    // Brand Collab sync kicked off for this order.
    expect(orderPortfolioSync.syncAcceptedOrder).toHaveBeenCalledWith(
      'order-1',
    );
  });

  it('does not re-sync an order that is already accepted', async () => {
    const { service, orderUpdateMany, orderPortfolioSync } = makeService({
      ...deliveredOrder,
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    });

    await service.acceptDelivery({
      actorUserId: 'user-1',
      brandProfileId: 'brand-1',
      orderId: 'order-1',
    });

    expect(orderUpdateMany).not.toHaveBeenCalled();
    expect(orderPortfolioSync.syncAcceptedOrder).not.toHaveBeenCalled();
  });

  it('still accepts even if the sync rejects (fire-and-forget)', async () => {
    const { service, orderPortfolioSync } = makeService(deliveredOrder);
    orderPortfolioSync.syncAcceptedOrder.mockRejectedValue(
      new Error('sync blew up'),
    );

    await expect(
      service.acceptDelivery({
        actorUserId: 'user-1',
        brandProfileId: 'brand-1',
        orderId: 'order-1',
      }),
    ).resolves.toBeUndefined();
  });
});

/**
 * The automatic path is the same acceptance, triggered by nobody. It has to
 * carry the same side effects — otherwise an order that closes on its own
 * silently skips the creator's portfolio tile and the completion mail.
 */
describe('OrdersService.autoAcceptDueOrder', () => {
  function makeService(order: Record<string, unknown>) {
    const orderUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const orderClient = {
      findUnique: jest.fn().mockResolvedValue(order),
      updateMany: orderUpdateMany,
      update: jest.fn().mockResolvedValue({}),
    };
    const prisma = {
      order: orderClient,
      $transaction: jest.fn(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          await fn({ order: orderClient }),
      ),
    };
    const orderPortfolioSync = {
      syncAcceptedOrder: jest.fn().mockResolvedValue({ status: 'created' }),
    };
    const events = { emit: jest.fn().mockResolvedValue(undefined) };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      createBrandAccessMock() as never,
      {} as never,
      orderPortfolioSync as never,
      {} as never,
      {} as never, // wallet
      events as never,
      { get: () => undefined } as never, // config
      { enabledFor: () => false, sendEvent: jest.fn() } as never, // meta capi off
    );
    return { service, orderUpdateMany, orderPortfolioSync, events };
  }

  const dueOrder = {
    id: 'order-7',
    brandId: 'brand-1',
    agencyId: null,
    status: 'DELIVERED',
    acceptedAt: null,
    autoAcceptAt: new Date('2026-03-15T09:00:00.000Z'),
    expectedAmountPaise: 500000,
    isFreeOrder: false,
    lastChatMessageId: null,
  };

  it('accepts as AUTO and runs the same side effects as a brand click', async () => {
    const { service, orderUpdateMany, orderPortfolioSync, events } =
      makeService(dueOrder);

    await expect(service.autoAcceptDueOrder('order-7')).resolves.toBe(true);

    expect(orderUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'ACCEPTED',
          acceptedBy: 'AUTO',
          autoAcceptAt: null,
        }),
      }),
    );
    expect(orderPortfolioSync.syncAcceptedOrder).toHaveBeenCalledWith(
      'order-7',
    );
    expect(events.emit).toHaveBeenCalledWith(
      'order-content-accepted-for-creator',
      { entityId: 'order-7' },
    );
    expect(events.emit).toHaveBeenCalledWith('order-completed-for-brand', {
      entityId: 'order-7',
    });
  });

  /**
   * The sweep selects on `autoAcceptAt`, but a revision requested between the
   * select and the claim clears it. Re-checking the deadline inside the WHERE
   * is what lets that revision win.
   */
  it('re-checks the deadline in the claim, not just in the sweep query', async () => {
    const { service, orderUpdateMany } = makeService(dueOrder);

    await service.autoAcceptDueOrder('order-7');

    const calls = orderUpdateMany.mock.calls as Array<
      [{ where: { autoAcceptAt?: { lte: Date } } }]
    >;
    expect(calls[0][0].where.autoAcceptAt?.lte).toBeInstanceOf(Date);
  });

  it('does nothing when the claim matches no row', async () => {
    const { service, orderUpdateMany, orderPortfolioSync, events } =
      makeService(dueOrder);
    orderUpdateMany.mockResolvedValue({ count: 0 });

    await expect(service.autoAcceptDueOrder('order-7')).resolves.toBe(false);

    expect(orderPortfolioSync.syncAcceptedOrder).not.toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('reports false for an order that no longer exists', async () => {
    const { service, orderUpdateMany } = makeService(dueOrder);
    (
      service as unknown as {
        prisma: { order: { findUnique: jest.Mock } };
      }
    ).prisma.order.findUnique.mockResolvedValue(null);

    await expect(service.autoAcceptDueOrder('order-7')).resolves.toBe(false);
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });
});

/**
 * Reversing an acceptance (admin reject of a disputed order) must pull the
 * Brand Collab tile, so refunded work is not showcased publicly.
 */
describe('OrdersService.adminRejectOrder → removes collab tile', () => {
  it('calls removeForOrder for the rejected order', async () => {
    const txClient = {
      orderDispute: { updateMany: jest.fn().mockResolvedValue({}) },
      order: {
        findUnique: jest.fn().mockResolvedValue({ lastChatMessageId: null }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      order: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'order-9', status: 'DISPUTED' }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(txClient),
      ),
    };
    const orderRealtime = {
      emitOrderDisputeResolved: jest.fn().mockResolvedValue(undefined),
    };
    const orderPortfolioSync = {
      removeForOrder: jest.fn().mockResolvedValue(undefined),
    };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      orderRealtime as never,
      {} as never,
      {} as never,
      {} as never,
      orderPortfolioSync as never,
      {} as never,
      {} as never, // wallet
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // notification events
      { get: () => undefined } as never, // config
      { enabledFor: () => false, sendEvent: jest.fn() } as never, // meta capi: off, so the Purchase event stays out of these tests
    );

    await service.adminRejectOrder({
      orderId: 'order-9',
      adminUserId: 'admin-1',
    });

    expect(orderPortfolioSync.removeForOrder).toHaveBeenCalledWith('order-9');
  });
});
