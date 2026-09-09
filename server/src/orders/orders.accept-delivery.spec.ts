import { OrdersService } from './orders.service';

/**
 * Wiring test for the Brand Collab hook: accepting a delivery must kick off the
 * portfolio sync (fire-and-forget), and accepting an already-accepted order must
 * not.
 */
describe('OrdersService.acceptDelivery → portfolio sync', () => {
  function makeService(order: Record<string, unknown>) {
    const orderUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        update: orderUpdate,
      },
    };
    const brandAccess = {
      resolveBrandContext: jest.fn().mockResolvedValue({
        brand: { id: 'brand-1' },
      }),
    };
    const orderMail = { notifyContentAccepted: jest.fn() };
    const orderPortfolioSync = {
      syncAcceptedOrder: jest.fn().mockResolvedValue({ status: 'created' }),
    };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      orderMail as never,
      {} as never,
      brandAccess as never,
      {} as never,
      orderPortfolioSync as never,
    );
    return { service, orderUpdate, orderMail, orderPortfolioSync };
  }

  const deliveredOrder = {
    id: 'order-1',
    brandId: 'brand-1',
    status: 'DELIVERED',
    acceptedAt: null,
    lastChatMessageId: null,
  };

  it('marks the order accepted and triggers the portfolio sync', async () => {
    const { service, orderUpdate, orderPortfolioSync } =
      makeService(deliveredOrder);

    await service.acceptDelivery({
      actorUserId: 'user-1',
      brandProfileId: 'brand-1',
      orderId: 'order-1',
    });

    // Order moved to ACCEPTED.
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      }),
    );
    // Brand Collab sync kicked off for this order.
    expect(orderPortfolioSync.syncAcceptedOrder).toHaveBeenCalledWith(
      'order-1',
    );
  });

  it('does not re-sync an order that is already accepted', async () => {
    const { service, orderUpdate, orderPortfolioSync } = makeService({
      ...deliveredOrder,
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    });

    await service.acceptDelivery({
      actorUserId: 'user-1',
      brandProfileId: 'brand-1',
      orderId: 'order-1',
    });

    expect(orderUpdate).not.toHaveBeenCalled();
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
    const orderMail = { notifyOrderRejected: jest.fn() };
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
      orderMail as never,
      {} as never,
      {} as never,
      {} as never,
      orderPortfolioSync as never,
    );

    await service.adminRejectOrder({
      orderId: 'order-9',
      adminUserId: 'admin-1',
    });

    expect(orderPortfolioSync.removeForOrder).toHaveBeenCalledWith('order-9');
  });
});
