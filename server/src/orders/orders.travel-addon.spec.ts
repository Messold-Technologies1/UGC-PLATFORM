import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * Unit tests for the travel add-on bought from the brief form: the brand picked
 * an on-location shoot (outdoor / a location they choose) on an order they
 * checked out without the creator's "Travel within City" add-on.
 *
 * The behaviours that matter are the money ones and the gate: the brief can't
 * be submitted until travel is on the order (unless the creator doesn't travel
 * at all), one Razorpay order per purchase at the creator's own price, and a
 * captured webhook that folds the add-on into the order so it settles through
 * the normal ledger — amount-verified and idempotent.
 */
describe('OrdersService travel add-on', () => {
  const TRAVEL_OPTION_NAME = 'Travel within City';

  /** The `data` of the last order.update, failing loudly if there wasn't one. */
  function lastOrderUpdateData(
    orderUpdate: jest.Mock<unknown, [{ data: Record<string, any> }]>,
  ): Record<string, any> {
    const call = orderUpdate.mock.calls.at(-1);
    if (!call) throw new Error('expected an order.update call');
    return call[0].data;
  }

  function makeService(opts: {
    order?: Record<string, unknown> | null;
    brief?: Record<string, unknown> | null;
    /** Creator's travel price in rupees; null = creator doesn't offer travel. */
    addOnPrice?: number | null;
    existingPurchase?: Record<string, unknown> | null;
    purchaseForWebhook?: Record<string, unknown> | null;
    /** Order row the paid-webhook transaction reads back. */
    orderForWebhook?: Record<string, unknown> | null;
  }) {
    // Typed arg so lastOrderUpdateData can read back the update payload.
    const orderUpdate = jest.fn((args: { data: Record<string, any> }) =>
      Promise.resolve(args.data),
    );
    const purchaseUpdate = jest.fn((args: any) =>
      Promise.resolve({ id: 'tp-1', ...args.data }),
    );
    const purchaseCreate = jest.fn((args: any) =>
      Promise.resolve({ id: 'tp-1', razorpayOrderId: null, ...args.data }),
    );

    const prisma = {
      order: {
        findUnique: jest.fn(({ select }: any) =>
          Promise.resolve(
            // updateOrder's chat-snapshot pre-read asks only for this column;
            // everything else is the caller's own lookup.
            select &&
              Object.keys(select).length === 1 &&
              select.lastChatMessageId
              ? { lastChatMessageId: 'msg-1' }
              : (opts.order ?? null),
          ),
        ),
        update: orderUpdate,
      },
      brief: {
        findFirst: jest.fn(() => Promise.resolve(opts.brief ?? null)),
      },
      creatorAddOnOption: {
        findUnique: jest.fn(() =>
          Promise.resolve({ name: TRAVEL_OPTION_NAME }),
        ),
      },
      creatorAddOn: {
        findFirst: jest.fn(() =>
          Promise.resolve(
            opts.addOnPrice == null
              ? null
              : {
                  id: 'addon-travel',
                  name: TRAVEL_OPTION_NAME,
                  priceAmount: new Prisma.Decimal(opts.addOnPrice),
                },
          ),
        ),
      },
      orderTravelPurchase: {
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
          orderTravelPurchase: { update: purchaseUpdate },
          order: {
            findUnique: jest.fn(() =>
              Promise.resolve(opts.orderForWebhook ?? null),
            ),
            update: orderUpdate,
          },
        }),
      ),
    };
    const razorpay = {
      createOrder: jest.fn(() => Promise.resolve({ id: 'rzp-1' })),
      getPublicKeyId: jest.fn(() => 'key_test'),
    };
    const brandAccess = createBrandAccessMock();
    const orderRealtime = {
      emitOrderTravelAddOnPurchased: jest.fn(),
      emitOrderBriefSubmitted: jest.fn(),
    };
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
      { get: () => undefined } as never, // config
      { enabledFor: () => false, sendEvent: jest.fn() } as never, // meta capi off
    );
    return { service, prisma, razorpay, events, orderRealtime, orderUpdate };
  }

  const travelAddOnSnapshot = {
    id: 'addon-travel',
    name: TRAVEL_OPTION_NAME,
    priceAmount: '500',
    description: null,
  };

  const awaitingBriefOrder = {
    id: 'order-1',
    brandId: 'brand-1',
    agencyId: null,
    creatorId: 'c1',
    status: 'BRIEF_SUBMISSION_PENDING',
    currency: 'INR',
    briefAcceptedAt: null,
    briefSubmittedAt: null,
    addOnsSnapshot: [],
  };

  describe('checkout', () => {
    it('creates a purchase + one Razorpay order at the creator travel price', async () => {
      const { service, razorpay, prisma } = makeService({
        order: awaitingBriefOrder,
        addOnPrice: 500, // ₹500 → 50000 paise
      });
      const session = await service.createTravelAddOnCheckout({
        orderId: 'order-1',
        actorUserId: 'user-1',
      });
      expect(prisma.orderTravelPurchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            creatorAddOnId: 'addon-travel',
            nameSnapshot: TRAVEL_OPTION_NAME,
            unitAmountPaise: 50000,
            expectedAmountPaise: 50000,
          }),
        }),
      );
      expect(razorpay.createOrder).toHaveBeenCalledTimes(1);
      expect(razorpay.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amountPaise: 50000, receipt: 'tp-1' }),
      );
      expect(session.amountPaise).toBe(50000);
      expect(session.razorpayOrderId).toBe('rzp-1');
    });

    it('rejects when the creator does not offer travel', async () => {
      const { service } = makeService({
        order: awaitingBriefOrder,
        addOnPrice: null,
      });
      await expect(
        service.createTravelAddOnCheckout({
          orderId: 'order-1',
          actorUserId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when travel is already on the order', async () => {
      const { service } = makeService({
        order: {
          ...awaitingBriefOrder,
          addOnsSnapshot: [travelAddOnSnapshot],
        },
        addOnPrice: 500,
      });
      await expect(
        service.createTravelAddOnCheckout({
          orderId: 'order-1',
          actorUserId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects once the creator has accepted the brief', async () => {
      const { service } = makeService({
        order: {
          ...awaitingBriefOrder,
          status: 'BRIEF_ACCEPTED',
          briefAcceptedAt: new Date(),
        },
        addOnPrice: 500,
      });
      await expect(
        service.createTravelAddOnCheckout({
          orderId: 'order-1',
          actorUserId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('re-quotes a pending purchase when the creator re-priced travel', async () => {
      const { service, prisma, razorpay } = makeService({
        order: awaitingBriefOrder,
        addOnPrice: 700,
        existingPurchase: {
          id: 'tp-1',
          unitAmountPaise: 50000,
          expectedAmountPaise: 50000,
          currency: 'INR',
          razorpayOrderId: 'rzp-old',
        },
      });
      const session = await service.createTravelAddOnCheckout({
        orderId: 'order-1',
        actorUserId: 'user-1',
      });
      expect(prisma.orderTravelPurchase.create).not.toHaveBeenCalled();
      expect(prisma.orderTravelPurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            unitAmountPaise: 70000,
            expectedAmountPaise: 70000,
            razorpayOrderId: null,
          }),
        }),
      );
      expect(razorpay.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({ amountPaise: 70000 }),
      );
      expect(session.amountPaise).toBe(70000);
    });
  });

  describe('captured webhook', () => {
    const pendingPurchase = {
      id: 'tp-1',
      orderId: 'order-1',
      status: 'PENDING_PAYMENT',
      creatorAddOnId: 'addon-travel',
      nameSnapshot: TRAVEL_OPTION_NAME,
      unitAmountPaise: 50000,
      expectedAmountPaise: 50000,
    };

    it('folds the add-on into the order so it settles like any add-on', async () => {
      const { service, orderUpdate, orderRealtime } = makeService({
        purchaseForWebhook: pendingPurchase,
        orderForWebhook: {
          addOnsSnapshot: [{ id: 'a1', name: 'Revision', priceAmount: '100' }],
          addOnsTotalSnapshot: new Prisma.Decimal(100),
          expectedAmountPaise: 300000,
          grossAmountPaise: 0,
        },
      });
      const result = await service.markTravelPurchasePaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date(),
        amountPaise: 50000,
      });
      expect(result).toEqual({ orderId: 'order-1', amountPaise: 50000 });

      const data = lastOrderUpdateData(orderUpdate);
      expect(data.addOnsSnapshot).toHaveLength(2);
      expect(data.addOnsSnapshot[1]).toEqual({
        id: 'addon-travel',
        name: TRAVEL_OPTION_NAME,
        priceAmount: '500',
        description: null,
      });
      expect(String(data.addOnsTotalSnapshot)).toBe('600');
      expect(data.expectedAmountPaise).toBe(350000);
      // Non-coupon order: grossAmountPaise stays 0 and the ledger falls back to
      // the net base, so bumping it would double-count the fee base.
      expect(data).not.toHaveProperty('grossAmountPaise');
      expect(orderRealtime.emitOrderTravelAddOnPurchased).toHaveBeenCalled();
    });

    it('keeps the platform-fee base in step on a coupon order', async () => {
      const { service, orderUpdate } = makeService({
        purchaseForWebhook: pendingPurchase,
        orderForWebhook: {
          addOnsSnapshot: [],
          addOnsTotalSnapshot: null,
          expectedAmountPaise: 250000,
          grossAmountPaise: 300000,
        },
      });
      await service.markTravelPurchasePaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date(),
        amountPaise: 50000,
      });
      const data = lastOrderUpdateData(orderUpdate);
      expect(data.expectedAmountPaise).toBe(300000);
      expect(data.grossAmountPaise).toBe(350000);
    });

    it('is idempotent: an already-paid purchase does not re-add the add-on', async () => {
      const { service, orderUpdate } = makeService({
        purchaseForWebhook: { ...pendingPurchase, status: 'PAID' },
      });
      const result = await service.markTravelPurchasePaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date(),
        amountPaise: 50000,
      });
      expect(result).toBeNull();
      expect(orderUpdate).not.toHaveBeenCalled();
    });

    it('refuses to grant on an amount mismatch', async () => {
      const { service, orderUpdate } = makeService({
        purchaseForWebhook: pendingPurchase,
      });
      const result = await service.markTravelPurchasePaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date(),
        amountPaise: 100, // wrong
      });
      expect(result).toBeNull();
      expect(orderUpdate).not.toHaveBeenCalled();
    });

    it('does not double-add when the order already carries travel', async () => {
      const { service, orderUpdate } = makeService({
        purchaseForWebhook: pendingPurchase,
        orderForWebhook: {
          addOnsSnapshot: [travelAddOnSnapshot],
          addOnsTotalSnapshot: new Prisma.Decimal(500),
          expectedAmountPaise: 350000,
          grossAmountPaise: 0,
        },
      });
      await service.markTravelPurchasePaidFromWebhook({
        razorpayOrderId: 'rzp-1',
        razorpayPaymentId: 'pay-1',
        paidAt: new Date(),
        amountPaise: 50000,
      });
      expect(orderUpdate).not.toHaveBeenCalled();
    });
  });

  describe('brief submit gate', () => {
    const onLocationBrief = {
      id: 'brief-1',
      willShipPhysicalProductToCreator: false,
      isProduct: false,
      productImageKey: null,
      shootLocationKind: 'BRAND_SELECTED_LOCATION',
    };

    it('blocks an on-location brief when the order has no travel add-on', async () => {
      const { service, orderUpdate } = makeService({
        order: awaitingBriefOrder,
        brief: onLocationBrief,
        addOnPrice: 500,
      });
      await expect(
        service.submitBrief({
          actorUserId: 'user-1',
          orderId: 'order-1',
          briefId: 'brief-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(orderUpdate).not.toHaveBeenCalled();
    });

    it('allows it once travel is on the order', async () => {
      const { service, orderUpdate } = makeService({
        order: { ...awaitingBriefOrder, addOnsSnapshot: [travelAddOnSnapshot] },
        brief: onLocationBrief,
        addOnPrice: 500,
      });
      await service.submitBrief({
        actorUserId: 'user-1',
        orderId: 'order-1',
        briefId: 'brief-1',
      });
      expect(orderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'BRIEF_SUBMITTED' }),
        }),
      );
    });

    it('warns rather than blocks when the creator offers no travel at all', async () => {
      const { service, orderUpdate } = makeService({
        order: awaitingBriefOrder,
        brief: onLocationBrief,
        addOnPrice: null, // creator doesn't travel — nothing to buy
      });
      await service.submitBrief({
        actorUserId: 'user-1',
        orderId: 'order-1',
        briefId: 'brief-1',
      });
      expect(orderUpdate).toHaveBeenCalled();
    });

    it('leaves shoots that need no travel alone', async () => {
      const { service, orderUpdate } = makeService({
        order: awaitingBriefOrder,
        brief: { ...onLocationBrief, shootLocationKind: 'CREATOR_OWN_SETUP' },
        addOnPrice: 500,
      });
      await service.submitBrief({
        actorUserId: 'user-1',
        orderId: 'order-1',
        briefId: 'brief-1',
      });
      expect(orderUpdate).toHaveBeenCalled();
    });
  });
});
