import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';

/**
 * Pay-with-credits at single-order checkout. Store credit is applied after any
 * coupon, to the net payable; the remainder (if any) is charged via Razorpay,
 * and full coverage skips Razorpay entirely. The credit is reserved (debited)
 * when the order is created.
 */
describe('OrdersService credit checkout', () => {
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

  function makeService(balancePaise: number) {
    const created: Array<Record<string, any>> = [];
    const prisma = {
      creatorPackage: {
        findFirst: jest.fn(() => Promise.resolve(pkgFor('c1', 5000))),
      },
      creatorAddOn: { findMany: jest.fn(() => Promise.resolve([])) },
      creatorAddOnOption: {
        findUnique: jest.fn(() => Promise.resolve({ name: 'Revision' })),
      },
      creatorProfile: { findMany: jest.fn(() => Promise.resolve([])) },
      order: {
        findMany: jest.fn(() => Promise.resolve([])),
        findUnique: jest.fn(() =>
          Promise.resolve({ lastChatMessageId: null }),
        ),
        update: jest.fn(({ where }: any) => Promise.resolve({ id: where.id })),
      },
      $transaction: jest.fn((cb: any) =>
        cb({
          order: {
            create: jest.fn(({ data }: any) => {
              created.push(data);
              return Promise.resolve({ id: 'order-1', currency: 'INR' });
            }),
          },
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
    const coupons = {
      resolveForCheckout: jest.fn(() => Promise.resolve(null)),
      recordRedemption: jest.fn(() => Promise.resolve()),
    };
    const orderRealtime = { emitOrderPayment: jest.fn(() => Promise.resolve()) };
    const wallet = {
      getBalance: jest.fn(() =>
        Promise.resolve({
          balancePaise,
          currency: 'INR',
          pendingWithdrawalPaise: 0,
        }),
      ),
      reserveForCheckout: jest.fn(() =>
        Promise.resolve({ balanceAfterPaise: 0 }),
      ),
      releaseCheckoutReservation: jest.fn(() =>
        Promise.resolve({ balanceAfterPaise: 0 }),
      ),
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
      wallet as any,
    );
    return { service, prisma, razorpay, created, wallet, orderRealtime };
  }

  const checkout = (service: OrdersService) =>
    service.createCheckout({
      actorUserId: 'u1',
      creatorId: 'c1',
      packageId: 'pkg-c1',
      useCredits: true,
    });

  it('full coverage places the order paid, reserves the whole net, and skips Razorpay', async () => {
    // net = ₹5000 = 500000 paise, balance = ₹7000
    const { service, razorpay, created, wallet } = makeService(700000);
    const result = await checkout(service);

    expect(wallet.reserveForCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', amountPaise: 500000 }),
      expect.anything(),
    );
    expect(created[0].status).toBe('BRIEF_SUBMISSION_PENDING');
    expect(created[0].paidAt).toBeInstanceOf(Date);
    expect(created[0].creditsAppliedPaise).toBe(500000);
    expect(created[0].expectedAmountPaise).toBe(500000);
    expect(razorpay.createOrder).not.toHaveBeenCalled();
    expect(result.paidFromCredits).toBe(true);
    expect(result.amountPaise).toBe(0);
    expect(result.creditsAppliedPaise).toBe(500000);
  });

  it('partial coverage reserves the balance and charges only the remainder', async () => {
    // net = 500000, balance = 300000 → charge 200000
    const { service, razorpay, created, wallet } = makeService(300000);
    const result = await checkout(service);

    expect(wallet.reserveForCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 300000 }),
      expect.anything(),
    );
    expect(created[0].status).toBe('PENDING_PAYMENT');
    expect(created[0].creditsAppliedPaise).toBe(300000);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 200000 }),
    );
    expect(result.amountPaise).toBe(200000);
    expect(result.creditsAppliedPaise).toBe(300000);
    expect(result.paidFromCredits).toBeUndefined();
  });

  it('never leaves a sub-₹1 Razorpay remainder (credit absorbs it)', async () => {
    // net = 500000, balance = 499950 → naive remainder 50 (< ₹1); credit is
    // reduced so the charge is exactly ₹1 (100 paise).
    const { service, razorpay, created } = makeService(499950);
    await checkout(service);

    expect(created[0].creditsAppliedPaise).toBe(499900);
    expect(razorpay.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amountPaise: 100 }),
    );
  });
});
