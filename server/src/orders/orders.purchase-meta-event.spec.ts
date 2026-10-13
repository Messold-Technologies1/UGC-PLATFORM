import { OrdersService } from './orders.service';
import type { MetaCapiEvent } from '../meta-capi/meta-capi.service';

/**
 * The Meta "Purchase" conversion. It is sent server-side only, at the moment an
 * order becomes paid — status BRIEF_SUBMISSION_PENDING with a paidAt — because
 * that transition is driven by a Razorpay webhook or by a coupon/credit order
 * placed without one, never by anything the browser can observe.
 *
 * Driven here through markPaidFromWebhook, the ordinary paid path.
 */
describe('OrdersService Purchase Meta event', () => {
  type SendEventMock = jest.Mock<Promise<void>, [MetaCapiEvent]>;
  /** Only the parts of a Prisma findUnique the mock below branches on. */
  type FindUniqueArgs = {
    where?: { razorpayOrderId?: string; id?: string };
    select?: Record<string, unknown>;
  };

  const PENDING_ORDER = {
    id: 'order-1',
    status: 'PENDING_PAYMENT',
    expectedAmountPaise: 150000,
    creditsAppliedPaise: 0,
    brandId: 'brand-1',
    agencyId: null,
    couponId: null,
    discountAmountPaise: 0,
  };

  const PAID_BRAND_ORDER = {
    status: 'BRIEF_SUBMISSION_PENDING',
    paidAt: new Date('2026-07-30T10:00:00Z'),
    creatorId: 'creator-1',
    currency: 'INR',
    expectedAmountPaise: 150000,
    creditsAppliedPaise: 20000,
    discountAmountPaise: 30000,
    grossAmountPaise: 180000,
    couponCodeSnapshot: 'DIWALI20',
    packageNameSnapshot: 'Standard',
    isFreeOrder: false,
    brand: {
      brandName: 'Messold Technologies',
      contactFullName: 'Anuj Sharma',
      contactEmail: 'anuj@messold.com',
      contactPhone: '+919876543210',
      user: { email: 'anuj@messold.com' },
    },
    agency: null,
  };

  function makeService(options?: {
    paidOrder?: Record<string, unknown> | null;
    capiEnabled?: boolean;
    sendEvent?: SendEventMock;
  }) {
    const paidOrder =
      options?.paidOrder === undefined ? PAID_BRAND_ORDER : options.paidOrder;
    const prisma = {
      order: {
        findUnique: jest.fn((args: FindUniqueArgs) => {
          // The inbox-activity helper reads the last chat message before an
          // update; the Purchase event reads the committed order itself.
          if (args?.select?.lastChatMessageId) {
            return Promise.resolve({ lastChatMessageId: null });
          }
          if (args?.where?.razorpayOrderId) {
            return Promise.resolve(PENDING_ORDER);
          }
          return Promise.resolve(paidOrder);
        }),
        update: jest.fn(() => Promise.resolve({})),
      },
    };
    const sendEvent = (options?.sendEvent ?? jest.fn()) as SendEventMock;
    const metaCapi = {
      enabledFor: jest.fn(() => options?.capiEnabled ?? true),
      sendEvent,
    };
    const service = new OrdersService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { recordRedemption: jest.fn() } as never,
      {} as never, // wallet
      { emit: jest.fn().mockResolvedValue(undefined) } as never, // notification events
      { get: () => undefined } as never, // config
      metaCapi as never,
    );
    return { service, sendEvent, prisma };
  }

  /** The event is fired-and-forgotten, so let its microtasks drain. */
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  async function markPaid(service: OrdersService) {
    return service.markPaidFromWebhook({
      razorpayOrderId: 'rzp-1',
      razorpayPaymentId: 'pay-1',
      paidAt: new Date('2026-07-30T10:00:00Z'),
      amountPaise: 150000,
    });
  }

  it('sends Purchase for a paid order, keyed to the order id', async () => {
    const { service, sendEvent } = makeService();

    await markPaid(service);
    await flush();

    expect(sendEvent).toHaveBeenCalledTimes(1);
    const event = sendEvent.mock.calls[0][0];
    expect(event).toMatchObject({
      audience: 'brand',
      eventName: 'Purchase',
      // Derived from the order, so webhook redelivery can't double-count.
      eventId: 'purchase-order-1',
      actionSource: 'website',
    });
    // Stamped with when the order was actually paid, not when we got round to it.
    expect(event.eventTime).toBe(
      Math.floor(new Date('2026-07-30T10:00:00Z').getTime() / 1000),
    );
    expect(event.customData).toMatchObject({
      account_type: 'brand',
      brand_name: 'Messold Technologies',
      content_ids: ['creator-1'],
      currency: 'INR',
      // What the brand pays in total; credit is a payment method, not a
      // discount, so it stays inside the value and rides along separately.
      value: 1500,
      gross_value: 1800,
      credits_applied: 200,
      discount: 300,
      coupon_code: 'DIWALI20',
      package_label: 'Standard',
    });
    // Identifiers travel as Advanced Matching, hashed by MetaCapiService.
    expect(event.userData).toMatchObject({
      email: 'anuj@messold.com',
      phone: '+919876543210',
      firstName: 'Anuj',
      lastName: 'Sharma',
    });
  });

  it('reports an agency order as the agency', async () => {
    const { service, sendEvent } = makeService({
      paidOrder: {
        ...PAID_BRAND_ORDER,
        brand: null,
        agency: {
          name: 'Messold Agency',
          contactFullName: 'Bipasha Roy',
          contactEmail: 'bipasha@messold.com',
          contactPhone: null,
        },
      },
    });

    await markPaid(service);
    await flush();

    expect(sendEvent.mock.calls[0][0].customData).toMatchObject({
      account_type: 'agency',
      brand_name: 'Messold Agency',
    });
  });

  it('sends nothing when the order did not reach brief-pending', async () => {
    const { service, sendEvent } = makeService({
      paidOrder: { ...PAID_BRAND_ORDER, status: 'PENDING_PAYMENT' },
    });

    await markPaid(service);
    await flush();

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('sends nothing for an order with no paidAt', async () => {
    const { service, sendEvent } = makeService({
      paidOrder: { ...PAID_BRAND_ORDER, paidAt: null },
    });

    await markPaid(service);
    await flush();

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('is a no-op when the brand dataset is not configured', async () => {
    const { service, sendEvent } = makeService({ capiEnabled: false });

    await markPaid(service);
    await flush();

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('still marks the order paid when the event fails to send', async () => {
    const sendEvent = jest.fn(() =>
      Promise.reject(new Error('network down')),
    ) as unknown as SendEventMock;
    const { service, prisma } = makeService({ sendEvent });

    await expect(markPaid(service)).resolves.toBe('order-1');
    await flush();

    expect(prisma.order.update).toHaveBeenCalled();
  });
});
