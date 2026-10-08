import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { OrdersService, USAGE_RIGHTS_DAYS_PER_ADDON } from './orders.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * Unit tests for the "buy extra usage rights" path (non-refundable 30-day
 * blocks, only after an order completes). Everything the service touches is
 * mocked; we assert the payment-correctness behaviours: completion gating, price
 * resolution from the creator's "Usage Rights extra 30 days" add-on, one
 * Razorpay order per purchase, and a captured webhook that atomically extends
 * the order's usage-rights days (idempotent, amount-verified).
 */
describe('OrdersService extra-usage-rights purchase', () => {
  const USAGE_OPTION_NAME = 'Usage Rights extra 30 days';

  function makeService(opts: {
    order?: Record<string, unknown> | null;
    addOnPrice?: number | null; // rupees; null = creator hasn't priced it
    existingPurchase?: Record<string, unknown> | null;
    purchaseForWebhook?: Record<string, unknown> | null;
  }) {
    const orderUpdate = jest.fn(() => Promise.resolve({}));
    const purchaseUpdate = jest.fn((args: any) =>
      Promise.resolve({ id: 'up-1', ...args.data }),
    );
    const purchaseCreate = jest.fn((args: any) =>
      Promise.resolve({
        id: 'up-1',
        razorpayOrderId: null,
        ...args.data,
      }),
    );

    const prisma = {
      order: {
        findUnique: jest.fn(() => Promise.resolve(opts.order ?? null)),
        update: orderUpdate,
      },
      creatorAddOnOption: {
        findUnique: jest.fn(() => Promise.resolve({ name: USAGE_OPTION_NAME })),
      },
      creatorAddOn: {
        findFirst: jest.fn(() =>
          Promise.resolve(
            opts.addOnPrice == null
              ? null
              : { priceAmount: new Prisma.Decimal(opts.addOnPrice) },
          ),
        ),
      },
      orderUsageRightsPurchase: {
        findFirst: jest.fn(() =>
          Promise.resolve(opts.existingPurchase ?? null),
        ),
        findUnique: jest.fn(() =>
          Promise.resolve(opts.purchaseForWebhook ?? null),
        ),
        create: purchaseCreate,
        update: purchaseUpdate,
      },
      $transaction: jest.fn((cb: any) =>
        cb({
          orderUsageRightsPurchase: { update: purchaseUpdate },
          order: { update: orderUpdate },
        }),
      ),
    };
    const razorpay = {
      createOrder: jest.fn(() => Promise.resolve({ id: 'rzp-1' })),
      getPublicKeyId: jest.fn(() => 'key_test'),
    };
    const brandAccess = createBrandAccessMock();
    const orderRealtime = { emitOrderUsageRightsPurchased: jest.fn() };

    const events = { emit: jest.fn().mockResolvedValue(undefined) };

    const service = new OrdersService(
      prisma as any,
      razorpay as any,
      orderRealtime as any,
      {} as any,
      brandAccess as any,
      {} as any,
      {} as any,
      {} as any,
      {} as never, // wallet
      events as never, // notification events
    );
    return { service, prisma, razorpay, events, orderRealtime, orderUpdate };
  }

  const completedOrder = {
    id: 'order-1',
    brandId: 'brand-1',
    creatorId: 'c1',
    status: 'ACCEPTED',
    currency: 'INR',
  };

  it('rejects when the order is not completed yet', async () => {
    const { service } = makeService({
      order: { ...completedOrder, status: 'DELIVERED' },
      addOnPrice: 300,
    });
    await expect(
      service.createUsageRightsCheckout({
        orderId: 'order-1',
        actorUserId: 'u1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the creator has not priced the usage-rights add-on', async () => {
    const { service } = makeService({
      order: completedOrder,
      addOnPrice: null,
    });
    await expect(
      service.createUsageRightsCheckout({
        orderId: 'order-1',
        actorUserId: 'u1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a purchase + one Razorpay order at the creator usage-rights price', async () => {
    const { service, razorpay, prisma } = makeService({
      order: completedOrder,
      addOnPrice: 300, // ₹300 → 30000 paise
    });
    const session = await service.createUsageRightsCheckout({
      orderId: 'order-1',
      actorUserId: 'u1',
    });
    expect(prisma.orderUsageRightsPurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          daysAdded: USAGE_RIGHTS_DAYS_PER_ADDON,
          unitAmountPaise: 30000,
          expectedAmountPaise: 30000,
        }),
      }),
    );
    expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 30000, receipt: 'up-1' }),
    );
    expect(session.amountPaise).toBe(30000);
    expect(session.razorpayOrderId).toBe('rzp-1');
    expect(session.orderId).toBe('order-1');
  });

  it('buys multiple blocks in one payment for the summed total', async () => {
    const { service, razorpay, prisma } = makeService({
      order: completedOrder,
      addOnPrice: 300, // ₹300/block → 30000 paise
    });
    const session = await service.createUsageRightsCheckout({
      orderId: 'order-1',
      actorUserId: 'u1',
      quantity: 3,
    });
    expect(prisma.orderUsageRightsPurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          daysAdded: 3 * USAGE_RIGHTS_DAYS_PER_ADDON, // +90 days
          unitAmountPaise: 30000, // per block
          expectedAmountPaise: 90000, // 3 × 30000
        }),
      }),
    );
    expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 90000 }),
    );
    expect(session.amountPaise).toBe(90000);
  });

  it('captures the webhook: extends usage days, notifies, and is amount-verified', async () => {
    const { service, events, orderUpdate, orderRealtime } = makeService({
      purchaseForWebhook: {
        id: 'up-1',
        orderId: 'order-1',
        status: 'PENDING_PAYMENT',
        daysAdded: 90,
        expectedAmountPaise: 90000,
      },
    });
    const result = await service.markUsageRightsPurchasePaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date(),
      amountPaise: 90000,
    });
    expect(result).toEqual({ orderId: 'order-1', daysAdded: 90 });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: { usageRightsExtraDays: { increment: 90 } },
      }),
    );
    expect(events.emit).toHaveBeenCalledWith(
      'order-extra-usage-rights-purchased-for-brand',
      { entityId: 'order-1', occurrenceKey: 'up-1' },
    );
    expect(events.emit).toHaveBeenCalledWith(
      'order-extra-usage-rights-purchased-for-creator',
      { entityId: 'order-1', occurrenceKey: 'up-1' },
    );
    expect(orderRealtime.emitOrderUsageRightsPurchased).toHaveBeenCalled();
  });

  it('is idempotent: an already-paid purchase does not re-grant', async () => {
    const { service, orderUpdate } = makeService({
      purchaseForWebhook: {
        id: 'up-1',
        orderId: 'order-1',
        status: 'PAID',
        daysAdded: 30,
        expectedAmountPaise: 30000,
      },
    });
    const result = await service.markUsageRightsPurchasePaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date(),
      amountPaise: 30000,
    });
    expect(result).toBeNull();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('refuses to grant on an amount mismatch', async () => {
    const { service, orderUpdate } = makeService({
      purchaseForWebhook: {
        id: 'up-1',
        orderId: 'order-1',
        status: 'PENDING_PAYMENT',
        daysAdded: 30,
        expectedAmountPaise: 30000,
      },
    });
    const result = await service.markUsageRightsPurchasePaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date(),
      amountPaise: 100, // wrong
    });
    expect(result).toBeNull();
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});
