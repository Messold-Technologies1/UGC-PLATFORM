import type { MetaCapiEvent } from '../meta-capi/meta-capi.service';
import { WishlistsService } from './wishlists.service';

/** Typed so assertions read the event's own fields, not `any`. */
type SendEventMock = jest.Mock<Promise<void>, [MetaCapiEvent]>;

/**
 * The server copy of the Meta "AddToWishlist" conversion. It mirrors the
 * browser pixel's event and is deduplicated against it by a shared event id,
 * so what matters here is that it fires on both save paths, carries that id,
 * and can never break the save it reports on.
 */
describe('WishlistsService AddToWishlist Meta event', () => {
  function makeService(options?: {
    capiEnabled?: boolean;
    sendEvent?: SendEventMock;
  }) {
    const prisma = {
      brandWishlist: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            brandId: 'brand-1',
            agencyId: null,
            name: 'Summer shortlist',
          }),
        ),
        create: jest.fn(() => Promise.resolve({ id: 'w-new' })),
      },
      creatorAddOn: { findMany: jest.fn(() => Promise.resolve([])) },
      brandWishlistCreator: { upsert: jest.fn(() => Promise.resolve({})) },
    };
    const brandAccess = {
      resolveOrderActor: jest.fn(() =>
        Promise.resolve({
          brand: {
            id: 'brand-1',
            brandName: 'Messold Technologies',
            contactFullName: 'Anuj Sharma',
            contactEmail: 'anuj@messold.com',
            contactPhone: '+919876543210',
            user: { email: 'anuj@messold.com' },
          },
          agency: null,
          brandId: 'brand-1',
          agencyId: null,
          actorUserId: 'u1',
          brandActorUserId: 'u1',
          isAgencyWorkspace: false,
          actingAgencyId: null,
        }),
      ),
      orderOwnerCreateData: jest.fn(() => ({ brandId: 'brand-1' })),
      wishlistAttributionCreateData: jest.fn(() => ({
        createdByAgencyId: null,
        createdByUserId: 'u1',
      })),
    };
    const sendEvent = (options?.sendEvent ?? jest.fn()) as SendEventMock;
    const metaCapi = {
      enabledFor: jest.fn(() => options?.capiEnabled ?? true),
      sendEvent,
    };
    // The engagement tally is fire-and-forget and these tests are about what
    // the wishlist itself persists, so it is stubbed to a no-op.
    const engagement = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new WishlistsService(
      prisma as any,
      brandAccess as any,
      metaCapi as any,
      engagement as any,
    );
    return { service, sendEvent, metaCapi, prisma };
  }

  /** The event is fired-and-forgotten, so let its microtasks drain. */
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('fires on adding a creator, with the id the browser pixel also builds', async () => {
    const { service, sendEvent } = makeService();

    await service.addCreator({
      actorUserId: 'u1',
      wishlistId: 'w1',
      creatorId: 'c1',
      meta: { fbp: 'fb.1.2.3', fbc: 'fb.1.4.5', ipAddress: '1.2.3.4' },
    });
    await flush();

    expect(sendEvent).toHaveBeenCalledTimes(1);
    const event = sendEvent.mock.calls[0][0];
    expect(event).toMatchObject({
      audience: 'brand',
      eventName: 'AddToWishlist',
      // Must match addToWishlistEventId() on both sides, or Meta double-counts.
      eventId: 'wishlist-add-w1-c1',
      actionSource: 'website',
    });
    expect(event.customData).toMatchObject({
      account_type: 'brand',
      brand_name: 'Messold Technologies',
      content_ids: ['c1'],
      wishlist_name: 'Summer shortlist',
    });
    // Attribution read in the buyer's browser is replayed on the server copy.
    expect(event.userData).toMatchObject({ fbp: 'fb.1.2.3', fbc: 'fb.1.4.5' });
  });

  it('fires once per creator a new wishlist is created around', async () => {
    const { service, sendEvent } = makeService();

    await service.createWishlist({
      actorUserId: 'u1',
      dto: { name: 'Diwali picks', creatorIds: ['c1', 'c2'] },
    });
    await flush();

    expect(sendEvent).toHaveBeenCalledTimes(2);
    expect(sendEvent.mock.calls.map(([e]) => e.eventId)).toEqual([
      'wishlist-add-w-new-c1',
      'wishlist-add-w-new-c2',
    ]);
  });

  it('sends nothing for a wishlist created with no creators in it', async () => {
    const { service, sendEvent } = makeService();

    await service.createWishlist({
      actorUserId: 'u1',
      dto: { name: 'Empty list' },
    });
    await flush();

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('is a no-op when the brand dataset is not configured', async () => {
    const { service, sendEvent } = makeService({ capiEnabled: false });

    await service.addCreator({
      actorUserId: 'u1',
      wishlistId: 'w1',
      creatorId: 'c1',
    });
    await flush();

    expect(sendEvent).not.toHaveBeenCalled();
  });

  it('still saves the creator when the event fails to send', async () => {
    const sendEvent = jest.fn(() =>
      Promise.reject(new Error('network down')),
    ) as unknown as SendEventMock;
    const { service, prisma } = makeService({ sendEvent });

    await expect(
      service.addCreator({
        actorUserId: 'u1',
        wishlistId: 'w1',
        creatorId: 'c1',
      }),
    ).resolves.toBeUndefined();
    await flush();

    expect(prisma.brandWishlistCreator.upsert).toHaveBeenCalledTimes(1);
  });
});
