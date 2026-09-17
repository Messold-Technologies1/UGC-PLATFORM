import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';

/**
 * Focused unit tests for the bulk-checkout path (one payment → many orders).
 * Everything the service touches is mocked; we assert the behaviours that
 * matter for payment correctness: invalid items are skipped (not fatal), the
 * total is the sum of valid items, exactly one Razorpay order is created for
 * that total, and a captured batch marks every child order paid.
 */
describe('OrdersService bulk checkout', () => {
  const pkgFor = (creatorId: string, price: number) => ({
    id: `pkg-${creatorId}`,
    creatorId,
    name: 'Basic',
    deliverables: [],
    priceAmount: new Prisma.Decimal(price),
    deliveryDays: 5,
    maxRevisions: 1,
    creator: { id: creatorId },
  });

  function makeService(overrides: {
    packages: Record<string, ReturnType<typeof pkgFor> | null>;
    /** When set, creatorAddOn.findMany returns these rows (e.g. a Revision add-on). */
    addOns?: Array<{ id: string; name: string; priceAmount: Prisma.Decimal }>;
  }) {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      creatorPackage: {
        findFirst: jest.fn(({ where }: any) => {
          const pkg = overrides.packages[where.creatorId];
          if (!pkg) return Promise.resolve(null);
          // When an id is supplied it must match; when omitted, resolve by creator.
          if (where.id && pkg.id !== where.id) return Promise.resolve(null);
          return Promise.resolve(pkg);
        }),
      },
      creatorAddOn: {
        findMany: jest.fn(() => Promise.resolve(overrides.addOns ?? [])),
      },
      creatorAddOnOption: {
        findUnique: jest.fn(() => Promise.resolve({ name: 'Revision' })),
      },
      // No "first order free" creators by default; the eligibility helper reads
      // enabled profiles and the brand's prior paid orders.
      creatorProfile: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      order: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      $transaction: jest.fn((cb: any) =>
        cb({
          orderCheckoutBatch: {
            create: jest.fn(() => Promise.resolve({ id: 'batch-1' })),
          },
          order: {
            create: jest.fn(({ data }: any) => {
              created.push(data);
              return Promise.resolve({ id: `order-${created.length}` });
            }),
          },
        }),
      ),
      orderCheckoutBatch: { update: jest.fn(() => Promise.resolve({})) },
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
    const coupons = {
      resolveForCheckout: jest.fn(() => Promise.resolve(null)),
      recordRedemption: jest.fn(() => Promise.resolve()),
    };

    const orderRealtime = {
      emitOrderPayment: jest.fn(() => Promise.resolve()),
    };
    const service = new OrdersService(
      prisma as any,
      razorpay as any,
      orderRealtime as any,
      {} as any,
      {} as any,
      brandAccess as any,
      {} as any,
      {} as any,
      coupons as any,
    );
    return { service, prisma, razorpay, created, coupons, orderRealtime };
  }

  it('creates one order per valid item and a single Razorpay order for the summed total', async () => {
    const { service, razorpay, created } = makeService({
      packages: { c1: pkgFor('c1', 1000), c2: pkgFor('c2', 2500) },
    });

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [
        { creatorId: 'c1', packageId: 'pkg-c1' },
        { creatorId: 'c2', packageId: 'pkg-c2' },
      ],
    });

    expect(created).toHaveLength(2);
    expect(result.orderCount).toBe(2);
    expect(result.skipped).toHaveLength(0);
    // 1000 + 2500 = 3500 rupees → 350000 paise
    expect(result.amountPaise).toBe(350000);
    expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 350000, receipt: 'batch-1' }),
    );
    // Every child order is linked to the batch and leaves razorpayOrderId unset.
    for (const data of created) {
      expect(data.checkoutBatchId).toBe('batch-1');
      expect(data.razorpayOrderId).toBeUndefined();
      // No Revision add-on selected → the fixed base of 2 revisions.
      expect(data.maxRevisionsSnapshot).toBe(2);
    }
  });

  it('places an all-free cart as a zero-rupee batch with no Razorpay call', async () => {
    const { service, prisma, razorpay, created, orderRealtime } = makeService({
      packages: { c1: pkgFor('c1', 1000), c2: pkgFor('c2', 2500) },
    });
    // Both creators have "first order free" enabled and no prior orders.
    prisma.creatorProfile.findMany.mockResolvedValue([
      { id: 'c1' },
      { id: 'c2' },
    ] as never);
    prisma.order.findMany.mockResolvedValue([] as never);

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [
        { creatorId: 'c1', packageId: 'pkg-c1' },
        { creatorId: 'c2', packageId: 'pkg-c2' },
      ],
    });

    expect(result.free).toBe(true);
    expect(result.amountPaise).toBe(0);
    expect(result.orderCount).toBe(2);
    // No payment gateway for a fully-free cart.
    expect(razorpay.createOrder).not.toHaveBeenCalled();
    // Both child orders are free, already placed (creator paid ₹0).
    for (const data of created) {
      expect(data.isFreeOrder).toBe(true);
      expect(data.expectedAmountPaise).toBe(0);
      expect(data.grossAmountPaise).toBe(0);
      expect(data.status).toBe('BRIEF_SUBMISSION_PENDING');
      expect(data.couponId).toBeNull();
    }
    expect(orderRealtime.emitOrderPayment).toHaveBeenCalledTimes(2);
  });

  it('charges only the paid creator when one item is first-order-free', async () => {
    const { service, prisma, razorpay, created } = makeService({
      packages: { c1: pkgFor('c1', 1000), c2: pkgFor('c2', 2500) },
    });
    // Only c1 is first-order-free; c2 is a normal paid order.
    prisma.creatorProfile.findMany.mockResolvedValue([{ id: 'c1' }] as never);
    prisma.order.findMany.mockResolvedValue([] as never);

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [
        { creatorId: 'c1', packageId: 'pkg-c1' },
        { creatorId: 'c2', packageId: 'pkg-c2' },
      ],
    });

    // Only c2's 2500 rupees are charged; c1 rides along free.
    expect(result.free).toBeUndefined();
    expect(result.amountPaise).toBe(250000);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 250000 }),
    );
    const free = created.find((d) => d.creatorId === 'c1')!;
    const paid = created.find((d) => d.creatorId === 'c2')!;
    expect(free.isFreeOrder).toBe(true);
    expect(free.expectedAmountPaise).toBe(0);
    expect(paid.isFreeOrder).toBe(false);
    expect(paid.expectedAmountPaise).toBe(250000);
  });

  it('does not offer a free order once the brand has ordered from the creator', async () => {
    const { service, prisma, razorpay } = makeService({
      packages: { c1: pkgFor('c1', 1000) },
    });
    // c1 is enabled, but this brand already has a prior paid order with them.
    prisma.creatorProfile.findMany.mockResolvedValue([{ id: 'c1' }] as never);
    prisma.order.findMany.mockResolvedValue([{ creatorId: 'c1' }] as never);

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [{ creatorId: 'c1', packageId: 'pkg-c1' }],
    });

    expect(result.free).toBeUndefined();
    expect(result.amountPaise).toBe(100000);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 100000 }),
    );
  });

  it('applies a cart-level coupon and splits the discount across child orders', async () => {
    const { service, razorpay, created, coupons } = makeService({
      packages: { c1: pkgFor('c1', 1000), c2: pkgFor('c2', 2500) },
    });
    // 20% off the 350000 grand total = 70000 discount.
    coupons.resolveForCheckout.mockResolvedValue({
      couponId: 'coupon-1',
      code: 'SAVE20',
      name: '20% off',
      discountType: 'PERCENTAGE',
      discountAmountPaise: 70000,
    } as never);

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [
        { creatorId: 'c1', packageId: 'pkg-c1' },
        { creatorId: 'c2', packageId: 'pkg-c2' },
      ],
      couponCode: 'SAVE20',
    });

    expect(result.grossAmountPaise).toBe(350000);
    expect(result.discountAmountPaise).toBe(70000);
    expect(result.amountPaise).toBe(280000); // net charged
    expect(result.couponCode).toBe('SAVE20');
    // Razorpay is charged the NET total.
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 280000 }),
    );
    // Discount split in proportion to gross: 100000/350000 and 250000/350000.
    const discounts = created.map((d) => d.discountAmountPaise);
    const nets = created.map((d) => d.expectedAmountPaise);
    expect(discounts).toEqual([20000, 50000]);
    expect(nets).toEqual([80000, 200000]);
    // Shares sum exactly to the cart discount (no rounding drift).
    expect((discounts as number[]).reduce((a, b) => a + b, 0)).toBe(70000);
    // Each child carries the coupon snapshot for manual admin settlement.
    for (const data of created) {
      expect(data.couponCodeSnapshot).toBe('SAVE20');
      expect(data.couponId).toBe('coupon-1');
    }
  });

  it('grants base 2 + 1 per selected Revision add-on (cap 3)', async () => {
    const { service, created } = makeService({
      packages: { c1: pkgFor('c1', 1000) },
      addOns: [
        { id: 'ao-rev', name: 'Revision', priceAmount: new Prisma.Decimal(300) },
      ],
    });

    await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [{ creatorId: 'c1', packageId: 'pkg-c1', addOnIds: ['ao-rev'] }],
    });

    expect(created).toHaveLength(1);
    expect(created[0].maxRevisionsSnapshot).toBe(3);
  });

  it('resolves the creator package when packageId is omitted', async () => {
    const { service, created } = makeService({
      packages: { c1: pkgFor('c1', 1000) },
    });

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [{ creatorId: 'c1' }], // no packageId — server resolves it
    });

    expect(result.orderCount).toBe(1);
    expect(created).toHaveLength(1);
    expect(created[0].creatorPackageId).toBe('pkg-c1');
    expect(result.amountPaise).toBe(100000);
  });

  it('skips a creator who is currently unavailable (offline)', async () => {
    const unavailable = {
      ...pkgFor('c1', 1000),
      creator: {
        id: 'c1',
        unavailability: {
          startsOn: new Date('2000-01-01'),
          endsOn: new Date('2100-01-01'),
        },
      },
    };
    const { service, created } = makeService({
      packages: { c1: unavailable as any, c2: pkgFor('c2', 2000) },
    });

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [
        { creatorId: 'c1', packageId: 'pkg-c1' },
        { creatorId: 'c2', packageId: 'pkg-c2' },
      ],
    });

    expect(result.orderCount).toBe(1);
    expect(created).toHaveLength(1);
    expect(result.amountPaise).toBe(200000);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        creatorId: 'c1',
        reason: 'Creator is currently unavailable',
      }),
    ]);
  });

  it('skips an invalid item and checks out the rest', async () => {
    const { service, razorpay, created } = makeService({
      packages: { c1: pkgFor('c1', 1000), bad: null },
    });

    const result = await service.createBulkCheckout({
      actorUserId: 'u1',
      items: [
        { creatorId: 'c1', packageId: 'pkg-c1' },
        { creatorId: 'bad', packageId: 'pkg-bad' },
      ],
    });

    expect(result.orderCount).toBe(1);
    expect(created).toHaveLength(1);
    expect(result.amountPaise).toBe(100000);
    expect(result.skipped).toEqual([
      expect.objectContaining({ creatorId: 'bad', packageId: 'pkg-bad' }),
    ]);
    expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
  });

  it('throws when no items are valid (no payment created)', async () => {
    const { service, razorpay } = makeService({ packages: { bad: null } });

    await expect(
      service.createBulkCheckout({
        actorUserId: 'u1',
        items: [{ creatorId: 'bad', packageId: 'pkg-bad' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(razorpay.createOrder).not.toHaveBeenCalled();
  });

  describe('markBatchPaidFromWebhook', () => {
    function makeWebhookService(batch: any, orders: Array<{ id: string }>) {
      const orderUpdates: Array<Record<string, unknown>> = [];
      const prisma = {
        orderCheckoutBatch: {
          findUnique: jest.fn(() => Promise.resolve(batch)),
          update: jest.fn(() => Promise.resolve({})),
        },
        order: {
          findMany: jest.fn(() => Promise.resolve(orders)),
          update: jest.fn((args: any) => {
            orderUpdates.push(args.data);
            return Promise.resolve({});
          }),
        },
        $transaction: jest.fn((cb: any) =>
          cb({
            order: {
              findUnique: jest.fn(() =>
                Promise.resolve({ lastChatMessageId: null }),
              ),
              update: jest.fn((args: any) => {
                orderUpdates.push(args.data);
                return Promise.resolve({});
              }),
            },
            orderCheckoutBatch: { update: jest.fn(() => Promise.resolve({})) },
          }),
        ),
      };
      const service = new OrdersService(
        prisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );
      return { service, prisma, orderUpdates };
    }

    it('marks every child order paid for a pending batch', async () => {
      const { service, orderUpdates } = makeWebhookService(
        { id: 'batch-1', status: 'PENDING_PAYMENT', expectedAmountPaise: 350000 },
        [{ id: 'o1' }, { id: 'o2' }],
      );

      const ids = await service.markBatchPaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date('2026-07-30T00:00:00Z'),
        amountPaise: 350000,
      });

      expect(ids).toEqual(['o1', 'o2']);
      expect(orderUpdates).toHaveLength(2);
      for (const data of orderUpdates) {
        expect(data.status).toBe('BRIEF_SUBMISSION_PENDING');
        expect(data.razorpayPaymentId).toBe('pay-1');
      }
    });

    it('does nothing on an amount mismatch', async () => {
      const { service } = makeWebhookService(
        { id: 'batch-1', status: 'PENDING_PAYMENT', expectedAmountPaise: 350000 },
        [{ id: 'o1' }],
      );

      const ids = await service.markBatchPaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date('2026-07-30T00:00:00Z'),
        amountPaise: 999,
      });

      expect(ids).toBeNull();
    });

    it('is idempotent for an already-paid batch', async () => {
      const { service } = makeWebhookService(
        { id: 'batch-1', status: 'PAID', expectedAmountPaise: 350000 },
        [{ id: 'o1' }],
      );

      const ids = await service.markBatchPaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date('2026-07-30T00:00:00Z'),
        amountPaise: 350000,
      });

      expect(ids).toBeNull();
    });
  });
});
