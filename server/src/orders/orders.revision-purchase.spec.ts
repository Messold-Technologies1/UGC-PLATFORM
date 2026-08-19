import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { OrdersService, REVISIONS_PER_ADDON } from './orders.service';

/**
 * Unit tests for the "buy extra revisions" path. Everything the service touches
 * is mocked; we assert the payment-correctness behaviours: eligibility gating,
 * price resolution from the creator's Revision add-on, one Razorpay order per
 * purchase, and a captured webhook that atomically raises the revision cap
 * (idempotent, amount-verified).
 */
describe('OrdersService extra-revisions purchase', () => {
  const REVISION_OPTION_NAME = 'Revision';

  function makeService(opts: {
    order?: Record<string, unknown> | null;
    addOnPrice?: number | null; // rupees; null = creator hasn't priced it
    existingPurchase?: Record<string, unknown> | null;
    purchaseForWebhook?: Record<string, unknown> | null;
  }) {
    const orderUpdate = jest.fn(() => Promise.resolve({}));
    const purchaseUpdate = jest.fn((args: any) =>
      Promise.resolve({ id: 'rp-1', ...args.data }),
    );
    const purchaseCreate = jest.fn((args: any) =>
      Promise.resolve({
        id: 'rp-1',
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
        findUnique: jest.fn(() =>
          Promise.resolve({ name: REVISION_OPTION_NAME }),
        ),
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
      orderRevisionPurchase: {
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
          orderRevisionPurchase: { update: purchaseUpdate },
          order: { update: orderUpdate },
        }),
      ),
    };
    const razorpay = {
      createOrder: jest.fn(() => Promise.resolve({ id: 'rzp-1' })),
      getPublicKeyId: jest.fn(() => 'key_test'),
    };
    const brandAccess = {
      resolveBrandContext: jest.fn(() =>
        Promise.resolve({ brand: { id: 'brand-1' } }),
      ),
    };
    const orderMail = { notifyExtraRevisionsPurchased: jest.fn() };
    const orderRealtime = { emitOrderRevisionsPurchased: jest.fn() };

    const service = new OrdersService(
      prisma as any,
      razorpay as any,
      orderRealtime as any,
      orderMail as any,
      {} as any,
      brandAccess as any,
      {} as any,
    );
    return { service, prisma, razorpay, orderMail, orderRealtime, orderUpdate };
  }

  const atCapOrder = {
    id: 'order-1',
    brandId: 'brand-1',
    creatorId: 'c1',
    status: 'DELIVERED',
    currency: 'INR',
    revisionCount: 1,
    maxRevisionsSnapshot: 1,
  };

  it('rejects when the order still has revisions remaining', async () => {
    const { service } = makeService({
      order: { ...atCapOrder, revisionCount: 0 },
      addOnPrice: 200,
    });
    await expect(
      service.createRevisionCheckout({ orderId: 'order-1', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the creator has not priced the Revision add-on', async () => {
    const { service } = makeService({ order: atCapOrder, addOnPrice: null });
    await expect(
      service.createRevisionCheckout({ orderId: 'order-1', actorUserId: 'u1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a purchase + one Razorpay order at the creator Revision price', async () => {
    const { service, razorpay, prisma } = makeService({
      order: atCapOrder,
      addOnPrice: 200, // ₹200 → 20000 paise
    });
    const session = await service.createRevisionCheckout({
      orderId: 'order-1',
      actorUserId: 'u1',
    });
    expect(prisma.orderRevisionPurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: 'order-1',
          revisionsAdded: REVISIONS_PER_ADDON,
          unitAmountPaise: 20000,
          expectedAmountPaise: 20000,
        }),
      }),
    );
    expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 20000, receipt: 'rp-1' }),
    );
    expect(session.amountPaise).toBe(20000);
    expect(session.razorpayOrderId).toBe('rzp-1');
    expect(session.orderId).toBe('order-1');
  });

  it('captures the webhook: raises the cap, notifies, and is amount-verified', async () => {
    const { service, orderUpdate, orderMail, orderRealtime } = makeService({
      purchaseForWebhook: {
        id: 'rp-1',
        orderId: 'order-1',
        status: 'PENDING_PAYMENT',
        revisionsAdded: 2,
        expectedAmountPaise: 20000,
      },
    });
    const result = await service.markRevisionPurchasePaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date(),
      amountPaise: 20000,
    });
    expect(result).toEqual({ orderId: 'order-1', revisionsAdded: 2 });
    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: { maxRevisionsSnapshot: { increment: 2 } },
      }),
    );
    expect(orderMail.notifyExtraRevisionsPurchased).toHaveBeenCalledWith(
      'order-1',
      2,
    );
    expect(orderRealtime.emitOrderRevisionsPurchased).toHaveBeenCalled();
  });

  it('is idempotent: an already-paid purchase does not re-grant', async () => {
    const { service, orderUpdate } = makeService({
      purchaseForWebhook: {
        id: 'rp-1',
        orderId: 'order-1',
        status: 'PAID',
        revisionsAdded: 2,
        expectedAmountPaise: 20000,
      },
    });
    const result = await service.markRevisionPurchasePaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date(),
      amountPaise: 20000,
    });
    expect(result).toBeNull();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('refuses to grant on an amount mismatch', async () => {
    const { service, orderUpdate } = makeService({
      purchaseForWebhook: {
        id: 'rp-1',
        orderId: 'order-1',
        status: 'PENDING_PAYMENT',
        revisionsAdded: 2,
        expectedAmountPaise: 20000,
      },
    });
    const result = await service.markRevisionPurchasePaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date(),
      amountPaise: 100, // wrong
    });
    expect(result).toBeNull();
    expect(orderUpdate).not.toHaveBeenCalled();
  });
});
