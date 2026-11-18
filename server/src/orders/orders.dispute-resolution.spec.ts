import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * Unwinding a dispute decides where an order lands and whether its acceptance
 * clock starts running again — the two things that, between them, can close an
 * order and pay for it with nobody present. None of it was covered.
 */
describe('OrdersService — unwinding a dispute', () => {
  function makeService(order: Record<string, unknown>) {
    const orderUpdate = jest.fn().mockResolvedValue({});
    const orderClient = {
      // The first lookup answers the service; the inbox-activity helper then
      // re-reads the row on every update, so one mock serves both.
      findUnique: jest.fn().mockResolvedValue(order),
      update: orderUpdate,
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const disputeUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const disputeClient = {
      findFirst: jest.fn().mockResolvedValue({ id: 'dispute-1' }),
      updateMany: disputeUpdateMany,
      update: jest.fn().mockResolvedValue({}),
    };
    const tx = { order: orderClient, orderDispute: disputeClient };
    const prisma = {
      ...tx,
      creatorProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'c-1' }) },
      $transaction: jest.fn(
        async (fn: (t: unknown) => Promise<unknown>) => await fn(tx),
      ),
    };
    const orderRealtime = {
      emitOrderDisputeResolved: jest.fn().mockResolvedValue(undefined),
    };
    const events = { emit: jest.fn().mockResolvedValue(undefined) };

    const service = new OrdersService(
      prisma as never,
      {} as never, // razorpay
      orderRealtime as never,
      {} as never, // storage
      createBrandAccessMock() as never,
      {} as never, // watermark queue
      { removeForOrder: jest.fn().mockResolvedValue(undefined) } as never,
      {} as never, // coupons
      {} as never, // wallet
      events as never,
      { get: () => undefined } as never, // config → default 5-day window
      { enabledFor: () => false, sendEvent: jest.fn() } as never,
    );
    return { service, prisma, orderUpdate, disputeUpdateMany, orderRealtime };
  }

  /** The `data` of the single `order.update` the restore performs. */
  function restoredData(orderUpdate: jest.Mock): Record<string, unknown> {
    expect(orderUpdate).toHaveBeenCalledTimes(1);
    return orderUpdate.mock.calls[0][0].data as Record<string, unknown>;
  }

  const disputedAfterDelivery = {
    id: 'order-1',
    brandId: 'brand-1',
    agencyId: null,
    creatorId: 'c-1',
    status: 'DISPUTED',
    preDisputeStatus: 'DELIVERED',
    deliveredAt: new Date('2026-01-01T00:00:00.000Z'),
    requiresPhysicalProductShipment: false,
    lastChatMessageId: 'msg-1',
  };

  describe('adminCloseDispute', () => {
    it('returns the order to its remembered status and restarts the clock', async () => {
      const { service, orderUpdate, disputeUpdateMany } = makeService(
        disputedAfterDelivery,
      );

      await service.adminCloseDispute({
        orderId: 'order-1',
        adminUserId: 'admin-1',
        resolutionNotes: 'Creator to re-deliver',
      });

      expect(disputeUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderId: 'order-1', status: 'OPEN' },
          data: expect.objectContaining({
            status: 'RESOLVED_CLOSED',
            resolvedByUserId: 'admin-1',
            resolutionNotes: 'Creator to re-deliver',
          }),
        }),
      );
      const data = restoredData(orderUpdate);
      expect(data.status).toBe('DELIVERED');
      expect(data.preDisputeStatus).toBeNull();
      expect(data.autoAcceptAt).toBeInstanceOf(Date);
    });

    it('measures the new deadline from now, not from the original delivery', async () => {
      // The delivery is a year old. Recomputing the window from it would hand
      // back a deadline that expired during the dispute, and the next sweep
      // would accept the order the moment the dispute closed.
      const { service, orderUpdate } = makeService(disputedAfterDelivery);
      const before = Date.now();

      await service.adminCloseDispute({
        orderId: 'order-1',
        adminUserId: 'admin-1',
      });

      const autoAcceptAt = restoredData(orderUpdate).autoAcceptAt as Date;
      expect(autoAcceptAt.getTime()).toBeGreaterThan(before);
    });

    it('leaves the clock off when the order goes back to a closed state', async () => {
      const { service, orderUpdate } = makeService({
        ...disputedAfterDelivery,
        preDisputeStatus: 'ACCEPTED',
      });

      await service.adminCloseDispute({
        orderId: 'order-1',
        adminUserId: 'admin-1',
      });

      const data = restoredData(orderUpdate);
      expect(data.status).toBe('ACCEPTED');
      expect(data.autoAcceptAt).toBeNull();
    });

    it('refuses an order that is not disputed', async () => {
      const { service } = makeService({
        ...disputedAfterDelivery,
        status: 'DELIVERED',
      });

      await expect(
        service.adminCloseDispute({
          orderId: 'order-1',
          adminUserId: 'admin-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    /**
     * Disputes opened before `preDisputeStatus` existed have NULL in it. The
     * old fallback was a flat DELIVERED, which marked an undelivered order as
     * delivered and started its acceptance clock — the sweep then accepted
     * work nobody had submitted, paid the brand its reward and published the
     * "delivery" to the creator's portfolio.
     */
    describe('with no remembered status (pre-migration dispute)', () => {
      it('sends an undelivered order back to the creator, with no clock', async () => {
        const { service, orderUpdate } = makeService({
          ...disputedAfterDelivery,
          preDisputeStatus: null,
          deliveredAt: null,
        });

        await service.adminCloseDispute({
          orderId: 'order-1',
          adminUserId: 'admin-1',
        });

        const data = restoredData(orderUpdate);
        expect(data.status).toBe('BRIEF_ACCEPTED');
        expect(data.status).not.toBe('DELIVERED');
        expect(data.autoAcceptAt).toBeNull();
      });

      it('sends a physical-product order back to PRODUCT_RECEIVED', async () => {
        const { service, orderUpdate } = makeService({
          ...disputedAfterDelivery,
          preDisputeStatus: null,
          deliveredAt: null,
          requiresPhysicalProductShipment: true,
        });

        await service.adminCloseDispute({
          orderId: 'order-1',
          adminUserId: 'admin-1',
        });

        expect(restoredData(orderUpdate).status).toBe('PRODUCT_RECEIVED');
      });

      it('still uses DELIVERED when the order really was delivered', async () => {
        const { service, orderUpdate } = makeService({
          ...disputedAfterDelivery,
          preDisputeStatus: null,
        });

        await service.adminCloseDispute({
          orderId: 'order-1',
          adminUserId: 'admin-1',
        });

        const data = restoredData(orderUpdate);
        expect(data.status).toBe('DELIVERED');
        expect(data.autoAcceptAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('withdrawDispute', () => {
    it('restores the order when its opener withdraws', async () => {
      const { service, prisma, orderUpdate, orderRealtime } = makeService(
        disputedAfterDelivery,
      );
      // Only the side that raised it may withdraw, so the open dispute has to
      // name the same opener as the caller.
      prisma.orderDispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        openedBy: 'CREATOR',
      });

      await service.withdrawDispute({
        orderId: 'order-1',
        openedBy: 'CREATOR',
        openerUserId: 'user-1',
      });

      expect(restoredData(orderUpdate).status).toBe('DELIVERED');
      expect(orderRealtime.emitOrderDisputeResolved).toHaveBeenCalledWith(
        expect.objectContaining({ outcome: 'WITHDRAWN' }),
      );
    });

    it('refuses a withdrawal by the side that did not raise it', async () => {
      const { service, prisma } = makeService(disputedAfterDelivery);
      prisma.orderDispute.findFirst.mockResolvedValue({
        id: 'dispute-1',
        openedBy: 'BRAND',
      });

      await expect(
        service.withdrawDispute({
          orderId: 'order-1',
          openedBy: 'CREATOR',
          openerUserId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
