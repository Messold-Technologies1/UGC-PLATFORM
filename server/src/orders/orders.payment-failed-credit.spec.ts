import { OrdersService } from './orders.service';

/**
 * payment.failed for a partial-credit checkout returns the reserved store credit
 * to the brand and closes the failed order (REJECTED); an ordinary cash order is
 * left PENDING_PAYMENT so the brand can retry the same payment.
 */
describe('OrdersService.onPaymentFailedFromWebhook (credit return)', () => {
  function makeService(order: Record<string, unknown> | null) {
    const orderUpdate = jest.fn().mockResolvedValue({ id: 'order-1' });
    const prisma: any = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        update: orderUpdate,
      },
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
      {} as never,
      wallet as never,
    );
    return { service, prisma, orderUpdate, wallet };
  }

  it('returns reserved credit and closes the order when a partial-credit payment fails', async () => {
    const { service, orderUpdate, wallet } = makeService({
      id: 'order-1',
      status: 'PENDING_PAYMENT',
      brandId: 'brand-1',
      creditsAppliedPaise: 300000,
      lastChatMessageId: null,
    });

    const result = await service.onPaymentFailedFromWebhook({
      razorpayOrderId: 'rzp_1',
    });

    expect(result).toBe('order-1');
    expect(wallet.releaseCheckoutReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 'brand-1',
        orderId: 'order-1',
        amountPaise: 300000,
      }),
      expect.anything(),
    );
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          creditsAppliedPaise: 0,
        }),
      }),
    );
  });

  it('leaves an ordinary (no-credit) order PENDING_PAYMENT for retry', async () => {
    const { service, orderUpdate, wallet } = makeService({
      id: 'order-1',
      status: 'PENDING_PAYMENT',
      brandId: 'brand-1',
      creditsAppliedPaise: 0,
      lastChatMessageId: null,
    });

    const result = await service.onPaymentFailedFromWebhook({
      razorpayOrderId: 'rzp_1',
    });

    expect(result).toBe('order-1');
    expect(wallet.releaseCheckoutReservation).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('ignores a payment.failed for an order no longer awaiting payment', async () => {
    const { service, wallet } = makeService({
      id: 'order-1',
      status: 'BRIEF_SUBMISSION_PENDING',
      brandId: 'brand-1',
      creditsAppliedPaise: 300000,
      lastChatMessageId: null,
    });

    const result = await service.onPaymentFailedFromWebhook({
      razorpayOrderId: 'rzp_1',
    });

    expect(result).toBeNull();
    expect(wallet.releaseCheckoutReservation).not.toHaveBeenCalled();
  });
});
