import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * The order half of "edit the brief until the creator accepts it".
 *
 * BriefsService owns the fork; OrdersService owns the two questions only the
 * order can answer — may this brief still be revised, and what does revising
 * do to the order. The window is BRIEF_SUBMITTED alone: before it there is no
 * brief, after it the creator has agreed to the brief as written.
 */
describe('OrdersService brief revision', () => {
  const TRAVEL_OPTION_NAME = 'Travel within City';

  function makeService(opts: {
    order?: Record<string, unknown> | null;
    /** Creator's travel price in rupees; null = creator doesn't offer travel. */
    addOnPrice?: number | null;
  }) {
    const orderUpdate = jest.fn((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'order-1', ...args.data }),
    );
    const prisma = {
      order: {
        findUnique: jest.fn(({ select }: { select?: Record<string, unknown> }) =>
          Promise.resolve(
            // updateOrder's chat-snapshot pre-read asks only for this column.
            select &&
              Object.keys(select).length === 1 &&
              select.lastChatMessageId
              ? { lastChatMessageId: null }
              : (opts.order ?? null),
          ),
        ),
        update: orderUpdate,
      },
      creatorAddOnOption: {
        findUnique: jest.fn(() => Promise.resolve({ name: TRAVEL_OPTION_NAME })),
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
      $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(prisma)),
    };
    const orderRealtime = { emitOrderBriefSubmitted: jest.fn() };
    const events = { emit: jest.fn().mockResolvedValue(undefined) };

    const service = new OrdersService(
      prisma as never,
      {} as never,
      orderRealtime as never,
      {} as never,
      createBrandAccessMock() as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      events as never,
      { get: () => undefined } as never,
      { enabledFor: () => false, sendEvent: jest.fn() } as never,
    );
    return { service, orderUpdate, orderRealtime, events };
  }

  const awaitingAcceptance = {
    id: 'order-1',
    brandId: 'brand-1',
    agencyId: null,
    creatorId: 'creator-1',
    status: 'BRIEF_SUBMITTED',
    briefId: 'brief-1',
    addOnsSnapshot: [],
    lastChatMessageId: null,
  };

  const revisable = {
    actorUserId: 'user-1',
    orderId: 'order-1',
    briefId: 'brief-1',
    isProduct: false,
    productImageKey: null,
    shootLocationKind: 'CREATOR_OWN_SETUP',
  };

  describe('assertBriefRevisable', () => {
    it('allows an edit while the creator has not answered', async () => {
      const { service } = makeService({ order: awaitingAcceptance });
      await expect(
        service.assertBriefRevisable(revisable),
      ).resolves.toBeUndefined();
    });

    it('refuses once the creator has accepted', async () => {
      const { service } = makeService({
        order: { ...awaitingAcceptance, status: 'BRIEF_ACCEPTED' },
      });
      await expect(service.assertBriefRevisable(revisable)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses to revise a brief the order has since moved off', async () => {
      const { service } = makeService({ order: awaitingAcceptance });
      await expect(
        service.assertBriefRevisable({ ...revisable, briefId: 'brief-stale' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('still requires a product image on a product brief', async () => {
      const { service } = makeService({ order: awaitingAcceptance });
      await expect(
        service.assertBriefRevisable({
          ...revisable,
          isProduct: true,
          productImageKey: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('re-runs the travel gate: an edit cannot move the shoot on location for free', async () => {
      const { service } = makeService({
        order: awaitingAcceptance,
        addOnPrice: 1500,
      });
      await expect(
        service.assertBriefRevisable({
          ...revisable,
          shootLocationKind: 'OUTDOOR_PUBLIC_LOCATION',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows an on-location edit when travel is already on the order', async () => {
      const { service } = makeService({
        order: {
          ...awaitingAcceptance,
          addOnsSnapshot: [{ id: 'a1', name: TRAVEL_OPTION_NAME }],
        },
        addOnPrice: 1500,
      });
      await expect(
        service.assertBriefRevisable({
          ...revisable,
          shootLocationKind: 'OUTDOOR_PUBLIC_LOCATION',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('resubmitBrief', () => {
    it('repoints the order at the revision and restarts the creator clock', async () => {
      const { service, orderUpdate, orderRealtime, events } = makeService({
        order: awaitingAcceptance,
      });

      await service.resubmitBrief({
        actorUserId: 'user-1',
        orderId: 'order-1',
        briefId: 'brief-fork-1',
        requiresPhysicalProductShipment: true,
      });

      const data = orderUpdate.mock.calls.at(-1)?.[0].data as Record<
        string,
        unknown
      >;
      expect(data.briefId).toBe('brief-fork-1');
      expect(data.briefSubmittedAt).toBeInstanceOf(Date);
      expect(data.briefRevisedAt).toEqual(data.briefSubmittedAt);
      // Re-snapshotted: the edit may have turned shipping on, which moves the
      // delivery clock from acceptance to product receipt.
      expect(data.requiresPhysicalProductShipment).toBe(true);
      // The creator still has the same unanswered decision in front of them.
      expect(data.status).toBeUndefined();

      // A page already open refreshes; nobody is emailed twice for one decision.
      expect(orderRealtime.emitOrderBriefSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'order-1' }),
      );
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('refuses to write once the creator has accepted', async () => {
      const { service, orderUpdate } = makeService({
        order: { ...awaitingAcceptance, status: 'BRIEF_ACCEPTED' },
      });

      await expect(
        service.resubmitBrief({
          actorUserId: 'user-1',
          orderId: 'order-1',
          briefId: 'brief-fork-1',
          requiresPhysicalProductShipment: false,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(orderUpdate).not.toHaveBeenCalled();
    });
  });
});
