import { OrdersService } from './orders.service';

/**
 * Admin "act on behalf" for the order brief flow: an admin can accept / reject
 * the brief (creator side) or cancel the order (brand side), and every action
 * records the acting admin. Admin cancel/reject notifies both parties that
 * support ended the order (not the brand/creator wording). A reason note is
 * required for reject/cancel. Self-serve actions still record their own actor.
 */
describe('OrdersService admin brief actions on behalf', () => {
  function makeService(order: Record<string, unknown> | null) {
    const orderUpdate = jest.fn().mockResolvedValue({
      id: 'order-1',
      status: 'BRIEF_ACCEPTED',
      briefAcceptedAt: new Date(),
      requiresPhysicalProductShipment: false,
      deliveryDueAt: null,
      deliveryGraceDeadlineAt: null,
    });
    const creatorFindUnique = jest.fn().mockResolvedValue({ id: 'creator-1' });
    const prisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        update: orderUpdate,
      },
      creatorProfile: { findUnique: creatorFindUnique },
    };
    const orderRealtime = {
      emitOrderCancelled: jest.fn().mockResolvedValue(undefined),
      emitOrderBriefAccepted: jest.fn().mockResolvedValue(undefined),
    };
    const orderMail = {
      notifyOrderCancelledBySupport: jest.fn(),
      notifyOrderCancelledByBrand: jest.fn(),
      notifyBriefRejectedByCreator: jest.fn(),
      notifyBriefAccepted: jest.fn(),
    };
    const brandAccess = {
      resolveBrandContext: jest
        .fn()
        .mockResolvedValue({ brand: { id: 'brand-1' } }),
    };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      orderRealtime as never,
      orderMail as never,
      {} as never,
      brandAccess as never,
      {} as never,
      {} as never,
    );
    return { service, orderUpdate, orderRealtime, orderMail };
  }

  const awaitingAcceptance = {
    id: 'order-1',
    brandId: 'brand-1',
    creatorId: 'creator-1',
    status: 'BRIEF_SUBMITTED',
    briefSubmittedAt: new Date(),
    briefAcceptedAt: null,
    deliveryDaysSnapshot: 5,
    requiresPhysicalProductShipment: false,
    deliveryDueAt: null,
    deliveryGraceDeadlineAt: null,
    lastChatMessageId: null,
  };

  it('admin accepts the brief on the creator behalf, recording the admin', async () => {
    const { service, orderUpdate, orderRealtime } =
      makeService(awaitingAcceptance);

    await service.adminAcceptBriefOnBehalf({
      orderId: 'order-1',
      adminUserId: 'admin-9',
    });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({
          status: 'BRIEF_ACCEPTED',
          briefAcceptedByUserId: 'admin-9',
          briefAcceptedBySupport: true,
        }),
      }),
    );
    expect(orderRealtime.emitOrderBriefAccepted).toHaveBeenCalled();
  });

  it('admin cancels on the brand behalf: records support actor + notifies support', async () => {
    const { service, orderUpdate, orderRealtime, orderMail } =
      makeService(awaitingAcceptance);

    await service.adminCancelOrderOnBehalf({
      orderId: 'order-1',
      adminUserId: 'admin-9',
      note: 'Cancelled at the brand request.',
    });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          cancelledByUserId: 'admin-9',
          cancelledOnBehalfOf: 'BRAND',
          cancelledBySupport: true,
          cancellationReason: 'Cancelled at the brand request.',
        }),
      }),
    );
    // Support wording, not the brand/creator-authored emails.
    expect(orderMail.notifyOrderCancelledBySupport).toHaveBeenCalledWith(
      'order-1',
      'Cancelled at the brand request.',
    );
    expect(orderMail.notifyOrderCancelledByBrand).not.toHaveBeenCalled();
    expect(orderMail.notifyBriefRejectedByCreator).not.toHaveBeenCalled();
    expect(orderRealtime.emitOrderCancelled).toHaveBeenCalledWith(
      expect.objectContaining({ cancelledBy: 'BRAND', bySupport: true }),
    );
  });

  it('admin rejects the brief on the creator behalf: attributed to CREATOR side', async () => {
    const { service, orderUpdate, orderMail } = makeService(awaitingAcceptance);

    await service.adminRejectBriefOnBehalf({
      orderId: 'order-1',
      adminUserId: 'admin-9',
      note: 'Creator asked us to decline.',
    });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          cancelledByUserId: 'admin-9',
          cancelledOnBehalfOf: 'CREATOR',
          cancelledBySupport: true,
        }),
      }),
    );
    expect(orderMail.notifyOrderCancelledBySupport).toHaveBeenCalled();
  });

  it('requires a reason note for an admin cancellation', async () => {
    const { service, orderUpdate } = makeService(awaitingAcceptance);

    await expect(
      service.adminCancelOrderOnBehalf({
        orderId: 'order-1',
        adminUserId: 'admin-9',
        note: '   ',
      }),
    ).rejects.toThrow(/note is required/i);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('refuses to cancel once the brief is already accepted', async () => {
    const { service, orderUpdate } = makeService({
      ...awaitingAcceptance,
      status: 'BRIEF_ACCEPTED',
    });

    await expect(
      service.adminCancelOrderOnBehalf({
        orderId: 'order-1',
        adminUserId: 'admin-9',
        note: 'too late',
      }),
    ).rejects.toThrow(/before the creator accepts/i);
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it('self-serve creator reject records the creator as actor (not support)', async () => {
    const { service, orderUpdate, orderMail } = makeService(awaitingAcceptance);

    await service.rejectBrief({
      creatorUserId: 'creator-user-1',
      orderId: 'order-1',
      note: 'Outside my niche.',
    });

    expect(orderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          cancelledByUserId: 'creator-user-1',
          cancelledOnBehalfOf: 'CREATOR',
          cancelledBySupport: false,
        }),
      }),
    );
    expect(orderMail.notifyBriefRejectedByCreator).toHaveBeenCalled();
    expect(orderMail.notifyOrderCancelledBySupport).not.toHaveBeenCalled();
  });
});
