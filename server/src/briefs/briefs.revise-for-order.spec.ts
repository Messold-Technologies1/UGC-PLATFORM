import { BadRequestException } from '@nestjs/common';
import { BriefsService } from './briefs.service';
import { createBrandAccessMock } from '../brand-access/brand-access.test-util';

/**
 * Editing a submitted brief from its order.
 *
 * The behaviour that matters is that the edit forks. A saved brief is a
 * reusable template — one row can sit on a whole batch of orders, and every
 * creator reads it live — so editing it in place would rewrite the brief under
 * creators who never saw the change, including ones already shooting to it.
 * The order gets a private copy instead, and the library brief is untouched.
 */
describe('BriefsService revise brief for order', () => {
  const savedBrief = {
    id: 'brief-1',
    brandId: 'brand-1',
    agencyId: null,
    orderScopedOrderId: null,
    forkedFromBriefId: null,
    brandName: 'Acme',
    productName: 'Acme Serum',
    productDescription: 'old description',
    productPageUrl: 'https://acme.test/serum',
    productImageKey: 'brief-product/brief-1/serum.jpg',
    productImageUrl: 'https://cdn.test/brief-product/brief-1/serum.jpg',
    isProduct: true,
    willShipPhysicalProductToCreator: false,
    wantsPhysicalProductReturned: false,
    shootLocationKind: 'CREATOR_OWN_SETUP',
    shootLocationAddress: null,
    durationBucket: 'SEC_15_30',
    contentType: ['UGC_AD'],
    toneStyle: ['CASUAL'],
    keyNoteToInclude: null,
    ctaNote: null,
    referenceLinks: [],
    script: null,
    finalNotes: null,
    brandPronunciationAudioKey: null,
    brandPronunciationAudioUrl: null,
    brandLogoKey: null,
    brandLogoUrl: null,
    industry: 'Beauty',
    placedByAgencyId: null,
    placedByUserId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  function makeService(opts?: {
    brief?: Record<string, unknown> | null;
    /** An order carrying this brief that the creator already accepted. */
    acceptedOrder?: Record<string, unknown> | null;
    /** Make the order-side validation refuse, as a bad edit would. */
    revisableError?: Error;
  }) {
    const brief = opts?.brief === undefined ? savedBrief : opts.brief;
    const briefCreate = jest.fn((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...savedBrief, id: 'brief-fork-1', ...args.data }),
    );
    const briefUpdate = jest.fn((args: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...savedBrief, ...args.data }),
    );
    const prisma = {
      brief: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(
            // The brief under test wins; anything else asked for is the fork
            // the service just created and reads back.
            brief && (brief as { id: string }).id === where.id
              ? brief
              : { ...savedBrief, id: where.id },
          ),
        ),
        findMany: jest.fn(() => Promise.resolve([])),
        create: briefCreate,
        update: briefUpdate,
      },
      order: {
        findFirst: jest.fn(() => Promise.resolve(opts?.acceptedOrder ?? null)),
      },
    };
    const storage = {
      copyBriefProductImageToBrief: jest.fn(
        ({ briefId }: { briefId: string }) =>
          Promise.resolve(`brief-product/${briefId}/serum.jpg`),
      ),
      finalizeBriefProductImageKey: jest.fn(
        ({ briefId }: { briefId: string }) =>
          Promise.resolve(`brief-product/${briefId}/new.jpg`),
      ),
      buildCdnUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
      deleteObjectIfExists: jest.fn().mockResolvedValue(undefined),
      isTempBriefProductImageKeyForUser: jest.fn(() => true),
    };
    const ordersService = {
      submitBrief: jest.fn().mockResolvedValue(undefined),
      assertBriefRevisable: opts?.revisableError
        ? jest.fn().mockRejectedValue(opts.revisableError)
        : jest.fn().mockResolvedValue(undefined),
      resubmitBrief: jest.fn().mockResolvedValue(undefined),
    };
    const agencyService = { recordBrandNameFromBrief: jest.fn() };

    const service = new BriefsService(
      prisma as never,
      storage as never,
      createBrandAccessMock() as never,
      agencyService as never,
      ordersService as never,
    );
    return { service, prisma, storage, ordersService, briefCreate, briefUpdate };
  }

  const revise = {
    actorUserId: 'user-1',
    briefId: 'brief-1',
    orderId: 'order-1',
  };

  it('forks the brief instead of rewriting the one other orders are reading', async () => {
    const { service, briefCreate, briefUpdate, ordersService } = makeService();

    const result = await service.reviseBriefForOrder({
      ...revise,
      dto: { productDescription: 'new description' },
    });

    // The library brief is never written to.
    expect(briefUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'brief-1' } }),
    );

    const forkData = briefCreate.mock.calls[0][0].data;
    expect(forkData.productDescription).toBe('new description');
    // Untouched fields come along, so the fork is a whole brief.
    expect(forkData.productName).toBe('Acme Serum');
    expect(forkData.orderScopedOrderId).toBe('order-1');
    expect(forkData.forkedFromBriefId).toBe('brief-1');

    // And the order is moved onto the copy.
    expect(ordersService.resubmitBrief).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 'order-1', briefId: 'brief-fork-1' }),
    );
    expect(result.id).toBe('brief-fork-1');
  });

  it('a revision of a revision still points at the original library brief', async () => {
    const { service, briefCreate } = makeService({
      brief: {
        ...savedBrief,
        id: 'brief-fork-1',
        orderScopedOrderId: 'order-1',
        forkedFromBriefId: 'brief-1',
      },
    });

    await service.reviseBriefForOrder({
      ...revise,
      briefId: 'brief-fork-1',
      dto: { ctaNote: 'Link in bio' },
    });

    expect(briefCreate.mock.calls[0][0].data.forkedFromBriefId).toBe('brief-1');
  });

  it('gives the fork its own image object so neither brief can blank the other', async () => {
    const { service, storage, briefUpdate } = makeService();

    await service.reviseBriefForOrder({
      ...revise,
      dto: { productDescription: 'new description' },
    });

    expect(storage.copyBriefProductImageToBrief).toHaveBeenCalledWith({
      sourceKey: 'brief-product/brief-1/serum.jpg',
      briefId: 'brief-fork-1',
    });
    expect(briefUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'brief-fork-1' },
        data: expect.objectContaining({
          productImageKey: 'brief-product/brief-fork-1/serum.jpg',
        }),
      }),
    );
    // The original's object is left where it is.
    expect(storage.deleteObjectIfExists).not.toHaveBeenCalled();
  });

  it('writes nothing when the order refuses the edit', async () => {
    const { service, briefCreate, ordersService } = makeService({
      revisableError: new BadRequestException('travel add-on missing'),
    });

    await expect(
      service.reviseBriefForOrder({
        ...revise,
        dto: { shootLocationKind: 'OUTDOOR_PUBLIC_LOCATION' as never },
      }),
    ).rejects.toThrow(BadRequestException);

    // No orphan fork, and the order never moves.
    expect(briefCreate).not.toHaveBeenCalled();
    expect(ordersService.resubmitBrief).not.toHaveBeenCalled();
  });

  it('passes the edited shipping flag on, since it moves the delivery clock', async () => {
    const { service, ordersService } = makeService();

    await service.reviseBriefForOrder({
      ...revise,
      dto: { willShipPhysicalProductToCreator: true },
    });

    expect(ordersService.resubmitBrief).toHaveBeenCalledWith(
      expect.objectContaining({ requiresPhysicalProductShipment: true }),
    );
  });

  describe('the library edit (PATCH /briefs/:id)', () => {
    it('refuses once a creator has accepted the brief on any order', async () => {
      const { service, briefUpdate } = makeService({
        acceptedOrder: { id: 'order-9' },
      });

      await expect(
        service.updateBrief({
          actorUserId: 'user-1',
          briefId: 'brief-1',
          dto: { productDescription: 'too late' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(briefUpdate).not.toHaveBeenCalled();
    });

    it('refuses to edit a fork, which must go through its order', async () => {
      const { service, briefUpdate } = makeService({
        brief: {
          ...savedBrief,
          id: 'brief-fork-9',
          orderScopedOrderId: 'order-1',
        },
      });

      await expect(
        service.updateBrief({
          actorUserId: 'user-1',
          briefId: 'brief-fork-9',
          dto: { productDescription: 'sneaky' },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(briefUpdate).not.toHaveBeenCalled();
    });

    it('still edits an ordinary saved brief in place', async () => {
      const { service, briefUpdate, briefCreate } = makeService();

      await service.updateBrief({
        actorUserId: 'user-1',
        briefId: 'brief-1',
        dto: { productDescription: 'tightened up' },
      });

      expect(briefCreate).not.toHaveBeenCalled();
      expect(briefUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'brief-1' },
          data: expect.objectContaining({
            productDescription: 'tightened up',
          }),
        }),
      );
    });
  });

  it('refuses to hand a fork to a second order', async () => {
    const { service, ordersService } = makeService({
      brief: {
        ...savedBrief,
        id: 'brief-fork-9',
        orderScopedOrderId: 'order-1',
      },
    });

    await expect(
      service.attachBriefToOrder({
        actorUserId: 'user-1',
        briefId: 'brief-fork-9',
        orderId: 'order-2',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(ordersService.submitBrief).not.toHaveBeenCalled();
  });

  it('keeps forks out of the saved-brief library', async () => {
    const { service, prisma } = makeService();

    await service.listBriefsForBrand({ actorUserId: 'user-1' });

    expect(prisma.brief.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orderScopedOrderId: null }),
      }),
    );
  });
});
