import { OrdersService } from './orders.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * Accepting a delivery rewards the brand with non-refundable store credit, when
 * the feature is switched on. The reward and the acceptance share one
 * transaction: an order can never end up ACCEPTED with the credit silently
 * lost, nor rewarded for an acceptance that rolled back.
 */
describe('OrdersService.acceptDelivery → completion reward credit', () => {
  function makeService(
    env: Record<string, string | undefined>,
    order: Record<string, unknown> = {},
  ) {
    const orderClient = {
      findUnique: jest.fn().mockResolvedValue({
        id: 'order-1',
        brandId: 'brand-1',
        agencyId: null,
        status: 'DELIVERED',
        acceptedAt: null,
        expectedAmountPaise: 500000,
        isFreeOrder: false,
        lastChatMessageId: null,
        ...order,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const transaction = jest.fn(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        await fn({ order: orderClient }),
    );
    const prisma = { order: orderClient, $transaction: transaction };
    const wallet = {
      hasCompletionCredit: jest.fn().mockResolvedValue(false),
      creditOrderCompletion: jest
        .fn()
        .mockResolvedValue({ balanceAfterPaise: 5000, promoAfterPaise: 5000 }),
    };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      createBrandAccessMock() as never,
      {} as never,
      { syncAcceptedOrder: jest.fn().mockResolvedValue({}) } as never,
      {} as never,
      wallet as never,
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // notification events
      { get: (key: string) => env[key] } as never, // config
    );
    return { service, wallet, orderClient, transaction };
  }

  const accept = (service: OrdersService) =>
    service.acceptDelivery({
      actorUserId: 'user-1',
      brandProfileId: 'brand-1',
      orderId: 'order-1',
    });

  const enabled = {
    ORDER_COMPLETION_CREDIT_ENABLED: 'true',
    ORDER_COMPLETION_CREDIT_PAISE: '5000',
  };

  it('credits the configured reward to the brand', async () => {
    const { service, wallet } = makeService(enabled);

    await accept(service);

    expect(wallet.creditOrderCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        agencyId: null,
        orderId: 'order-1',
        amountPaise: 5000,
      }),
      expect.anything(),
    );
  });

  it('awards the credit inside the acceptance transaction', async () => {
    const { service, wallet, transaction, orderClient } = makeService(enabled);

    await accept(service);

    expect(transaction).toHaveBeenCalledTimes(1);
    // Same transaction client for the status update and the credit.
    expect(wallet.creditOrderCompletion).toHaveBeenCalledWith(
      expect.anything(),
      { order: orderClient },
    );
    expect(orderClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      }),
    );
  });

  it('honours a changed amount without a code change', async () => {
    const { service, wallet } = makeService({
      ...enabled,
      ORDER_COMPLETION_CREDIT_PAISE: '10000',
    });

    await accept(service);

    expect(wallet.creditOrderCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 10000 }),
      expect.anything(),
    );
  });

  it('still accepts the order, with no credit, when the feature is off', async () => {
    const { service, wallet, orderClient } = makeService({
      ...enabled,
      ORDER_COMPLETION_CREDIT_ENABLED: 'false',
    });

    await accept(service);

    expect(orderClient.update).toHaveBeenCalled();
    expect(wallet.creditOrderCompletion).not.toHaveBeenCalled();
  });

  it('does not reward a free order', async () => {
    const { service, wallet } = makeService(enabled, {
      isFreeOrder: true,
      expectedAmountPaise: 0,
    });

    await accept(service);

    expect(wallet.creditOrderCompletion).not.toHaveBeenCalled();
  });

  it('does not reward the same order twice', async () => {
    const { service, wallet } = makeService(enabled);
    wallet.hasCompletionCredit.mockResolvedValue(true);

    await accept(service);

    expect(wallet.creditOrderCompletion).not.toHaveBeenCalled();
  });

  it('does not reward an order that was already accepted', async () => {
    const { service, wallet, orderClient } = makeService(enabled, {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    });

    await accept(service);

    expect(orderClient.update).not.toHaveBeenCalled();
    expect(wallet.creditOrderCompletion).not.toHaveBeenCalled();
  });

  it('rolls the acceptance back when the credit fails', async () => {
    const { service, wallet, orderClient } = makeService(enabled);
    wallet.creditOrderCompletion.mockRejectedValue(new Error('wallet down'));

    await expect(accept(service)).rejects.toThrow('wallet down');
    // The update ran, but inside the transaction that threw — nothing commits.
    expect(orderClient.update).toHaveBeenCalled();
  });
});
