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
  }) {
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      creatorPackage: {
        findFirst: jest.fn(({ where }: any) => {
          const pkg = overrides.packages[where.creatorId];
          return Promise.resolve(
            pkg && pkg.id === where.id ? pkg : null,
          );
        }),
      },
      creatorAddOn: { findMany: jest.fn(() => Promise.resolve([])) },
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

    const service = new OrdersService(
      prisma as any,
      razorpay as any,
      {} as any,
      {} as any,
      {} as any,
      brandAccess as any,
      {} as any,
    );
    return { service, prisma, razorpay, created };
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
    }
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
