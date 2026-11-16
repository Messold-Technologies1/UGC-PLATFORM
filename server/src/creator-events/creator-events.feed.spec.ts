import { CreatorEventsService } from './creator-events.service';
import { CREATOR_EVENT_PAGE_SIZE } from './creator-events.constants';

/**
 * The brand feed. Two things matter here beyond "it returns rows": what the
 * query refuses to show, and what the response refuses to carry.
 */
describe('CreatorEventsService — brand feed', () => {
  function creatorRow(overrides: Record<string, unknown> = {}) {
    return {
      id: 'creator-1',
      publicSlug: 'riyasharma',
      publicNameSlug: null,
      profileImageUrl: null,
      city: 'Delhi',
      firstOrderFreeEnabled: false,
      stats: { avgRating: '4.90', reviewCount: 23, completedOrders: 23 },
      packages: [{ priceAmount: '4500', deliveryDays: 5 }],
      addOns: [{ name: 'On-location shoot', priceAmount: '1500' }],
      facetSelections: [
        { rank: 0, customLabel: null, option: { label: 'Fashion' } },
        { rank: 1, customLabel: null, option: { label: 'Beauty' } },
      ],
      ...overrides,
    };
  }

  function eventRow(id: string, overrides: Record<string, unknown> = {}) {
    return {
      id,
      body: 'In Goa until the 23rd.',
      createdAt: new Date('2026-11-16T09:12:00Z'),
      editedAt: null,
      hiddenAt: null,
      hiddenReason: null,
      creator: creatorRow(),
      ...overrides,
    };
  }

  function makeService(
    rows: unknown[],
    onLocationOptionName = 'On-location shoot',
  ) {
    const findMany = jest.fn<Promise<unknown[]>, [Record<string, unknown>]>(
      () => Promise.resolve(rows),
    );
    const prisma = {
      creatorProfile: { findUnique: jest.fn() },
      creatorEvent: { findMany, count: jest.fn() },
      creatorAddOnOption: {
        findUnique: jest.fn(() =>
          Promise.resolve(
            onLocationOptionName ? { name: onLocationOptionName } : null,
          ),
        ),
      },
    };
    return { service: new CreatorEventsService(prisma as never), findMany };
  }

  it('excludes hidden posts, deleted posts and unlisted creators', async () => {
    const { service, findMany } = makeService([eventRow('e1')]);

    await service.listFeed({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          hiddenAt: null,
          creator: { isListed: true },
        },
      }),
    );
  });

  it('orders newest first with id as a total-order tiebreaker', async () => {
    const { service, findMany } = makeService([eventRow('e1')]);

    await service.listFeed({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
  });

  it('pages by keyset, not offset, so a post written mid-scroll shifts nothing', async () => {
    const { service, findMany } = makeService([eventRow('e1')]);

    await service.listFeed({ cursor: 'e0' });

    const args = findMany.mock.calls[0][0];
    expect(args.cursor).toEqual({ id: 'e0' });
    // The giveaway for offset paging would be a `skip` that grows with the
    // page number. It is always exactly 1: step past the cursor row itself.
    expect(args.skip).toBe(1);
  });

  it('returns a cursor only while more rows exist', async () => {
    const full = Array.from({ length: CREATOR_EVENT_PAGE_SIZE + 1 }, (_, i) =>
      eventRow(`e${i}`),
    );
    const { service } = makeService(full);

    const page = await service.listFeed({});

    expect(page.items).toHaveLength(CREATOR_EVENT_PAGE_SIZE);
    expect(page.nextCursor).toBe(`e${CREATOR_EVENT_PAGE_SIZE - 1}`);
  });

  it('returns a null cursor on the last page', async () => {
    const { service } = makeService([eventRow('e1'), eventRow('e2')]);

    const page = await service.listFeed({});

    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  /**
   * The anonymity regression test.
   *
   * Every brand-facing response on this platform identifies a creator by
   * `publicSlug` — "Brands see the opaque public slug, never the creator's
   * real name" (creator-profile.service.ts). A feed card is one more
   * brand-facing response, and the free-text feature is exactly where a
   * careless `include: { creator: true }` would undo that.
   */
  it('identifies the creator by public slug and carries no real name', async () => {
    const { service, findMany } = makeService([eventRow('e1')]);

    const page = await service.listFeed({});

    expect(page.items[0].creator.name).toBe('riyasharma');
    expect(JSON.stringify(page.items)).not.toContain('displayName');

    // The query must not ask for the column at all — not merely strip it after.
    const args = findMany.mock.calls[0][0] as any;
    expect(args.select.creator.select).not.toHaveProperty('displayName');
  });

  it('links to the revealed name slug when an admin has set one', async () => {
    const { service } = makeService([
      eventRow('e1', {
        creator: creatorRow({ publicNameSlug: 'riya-sharma' }),
      }),
    ]);

    const page = await service.listFeed({});

    // The link follows the canonical URL; the visible label stays opaque.
    expect(page.items[0].creator.publicSlug).toBe('riya-sharma');
    expect(page.items[0].creator.name).toBe('riyasharma');
  });

  it('carries the credentials the card shows', async () => {
    const { service } = makeService([eventRow('e1')]);

    const { creator } = (await service.listFeed({})).items[0];

    expect(creator.categories).toEqual(['Fashion', 'Beauty']);
    expect(creator.avgRating).toBe('4.90');
    expect(creator.ordersCompleted).toBe(23);
    expect(creator.startingPrice).toBe(4500);
    expect(creator.deliveryDays).toBe(5);
    expect(creator.onLocationShoot).toBe(true);
  });

  it('degrades for a creator with no stats, package or add-ons', async () => {
    const { service } = makeService([
      eventRow('e1', {
        creator: creatorRow({
          stats: null,
          packages: [],
          addOns: [],
          facetSelections: [],
        }),
      }),
    ]);

    const { creator } = (await service.listFeed({})).items[0];

    expect(creator.avgRating).toBeNull();
    expect(creator.reviewCount).toBe(0);
    expect(creator.ordersCompleted).toBe(0);
    expect(creator.startingPrice).toBeNull();
    expect(creator.deliveryDays).toBeNull();
    expect(creator.onLocationShoot).toBe(false);
    expect(creator.categories).toEqual([]);
  });

  it('does not claim on-location shoots for an unpriced add-on', async () => {
    const { service } = makeService([
      eventRow('e1', {
        creator: creatorRow({
          addOns: [{ name: 'On-location shoot', priceAmount: '0' }],
        }),
      }),
    ]);

    expect((await service.listFeed({})).items[0].creator.onLocationShoot).toBe(
      false,
    );
  });

  it('resolves the on-location add-on name once per page, not once per post', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => eventRow(`e${i}`));
    const findMany = jest.fn<Promise<unknown[]>, [Record<string, unknown>]>(
      () => Promise.resolve(rows),
    );
    const optionLookup = jest.fn(() =>
      Promise.resolve({ name: 'On-location shoot' }),
    );
    const service = new CreatorEventsService({
      creatorEvent: { findMany },
      creatorAddOnOption: { findUnique: optionLookup },
    } as never);

    await service.listFeed({});

    expect(optionLookup).toHaveBeenCalledTimes(1);
  });

  it('caps an oversized page request', async () => {
    const { service, findMany } = makeService([eventRow('e1')]);

    await service.listFeed({ limit: 5000 });

    // take is size + 1: the extra row answers "is there more?" without a count.
    expect((findMany.mock.calls[0][0] as any).take).toBe(51);
  });
});
