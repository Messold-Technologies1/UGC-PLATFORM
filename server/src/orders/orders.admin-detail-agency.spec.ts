import { OrdersService } from './orders.service';

/**
 * An agency-placed order has no brand at all: `Order.brandId` and
 * `Order.agencyId` are mutually exclusive (the XOR invariant on the model), so
 * `order.brand` comes back null. The admin detail endpoint used to hand that
 * null straight to the brand mapper, which read a property off it and threw —
 * every agency order 500'd on open, while the admin LIST showed it fine.
 */
describe('OrdersService.getOrderDetailsForAdmin — agency-placed orders', () => {
  const ORDER_ID = 'd5908762-f2c4-4bff-a4eb-840f396a1822';

  function makeService(order: Record<string, unknown>) {
    const findUnique = jest.fn().mockResolvedValue(order);
    const prisma = {
      order: { findUnique },
      orderDispute: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const wallet = {
      getCompletionCreditForOrder: jest.fn().mockResolvedValue(null),
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
      { emit: jest.fn().mockResolvedValue(undefined) } as never,
      { get: () => undefined } as never,
      { enabledFor: () => false, sendEvent: jest.fn() } as never,
    );
    return { service, findUnique };
  }

  /** Only the fields the mapper reads; everything else defaults to null. */
  function orderRow(over: Record<string, unknown>) {
    const at = new Date('2026-11-13T00:00:00Z');
    return {
      id: ORDER_ID,
      status: 'ACCEPTED',
      createdAt: at,
      updatedAt: at,
      // Prisma hands these back as Decimal; only `toString` is read.
      priceAmountSnapshot: { toString: () => '500.00' },
      addOnsTotalSnapshot: { toString: () => '0.00' },
      currency: 'INR',
      packageNameSnapshot: 'Standard',
      deliverablesSnapshot: [],
      deliveryDaysSnapshot: 5,
      maxRevisionsSnapshot: 2,
      expectedAmountPaise: 50000,
      grossAmountPaise: 50000,
      discountAmountPaise: 0,
      isFreeOrder: false,
      requiresPhysicalProductShipment: false,
      briefId: null,
      acceptedAt: null,
      acceptedBy: null,
      autoAcceptAt: null,
      briefAcceptedAt: null,
      briefRevisedAt: null,
      briefSubmittedAt: null,
      courierName: null,
      creatorPaidAt: null,
      deliveredAt: null,
      deliveryDueAt: null,
      deliveryGraceDeadlineAt: null,
      dispatchedAt: null,
      paidAt: null,
      productReceivedAt: null,
      trackingId: null,
      couponCodeSnapshot: null,
      couponNameSnapshot: null,
      discountTypeSnapshot: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      razorpayRefundId: null,
      creator: {
        id: 'creator-1',
        displayName: 'Riya',
        introVideoUrl: null,
        profileImageUrl: null,
        city: 'Mumbai',
      },
      brand: null,
      agency: null,
      briefRef: null,
      revisionPurchases: [],
      usageRightsPurchases: [],
      cancelledByUser: null,
      briefAcceptedByUser: null,
      ...over,
    };
  }

  it('describes the agency as the buyer instead of throwing on a null brand', async () => {
    const { service } = makeService(
      orderRow({
        agency: { id: 'agency-1', name: 'Best Agency', logoUrl: 'logo.png' },
        briefRef: { brandName: 'Acme Beauty' },
      }),
    );

    const res = await service.getOrderDetailsForAdmin({ orderId: ORDER_ID });

    expect(res.brand.id).toBe('agency-1');
    // The client the agency is buying for leads, matching the admin list.
    expect(res.brand.brandName).toBe('Acme Beauty');
  });

  it('falls back to the agency name when the brief names no client brand', async () => {
    const { service } = makeService(
      orderRow({
        agency: { id: 'agency-1', name: 'Best Agency', logoUrl: null },
        briefRef: null,
      }),
    );

    const res = await service.getOrderDetailsForAdmin({ orderId: ORDER_ID });

    expect(res.brand.brandName).toBe('Best Agency');
  });

  it('still maps a brand-placed order from the brand', async () => {
    const { service } = makeService(
      orderRow({
        brand: {
          id: 'brand-1',
          brandName: 'Acme Beauty',
          logoUrl: null,
          contactFullName: null,
          contactEmail: null,
          user: { name: 'Jane Doe', email: 'jane@acme.test' },
        },
      }),
    );

    const res = await service.getOrderDetailsForAdmin({ orderId: ORDER_ID });

    expect(res.brand.id).toBe('brand-1');
    expect(res.brand.brandName).toBe('Acme Beauty');
    // Falls back to the account holder when no explicit contact is stored.
    expect(res.brand.contactFullName).toBe('Jane Doe');
  });

  it('selects the agency and the brief alongside the brand', async () => {
    const { service, findUnique } = makeService(
      orderRow({ agency: { id: 'a', name: 'A', logoUrl: null } }),
    );

    await service.getOrderDetailsForAdmin({ orderId: ORDER_ID });

    // Without these in the select there is nothing to fall back to.
    const select = findUnique.mock.calls[0][0].select;
    expect(select.agency).toBeDefined();
    expect(select.briefRef).toBeDefined();
  });
});
