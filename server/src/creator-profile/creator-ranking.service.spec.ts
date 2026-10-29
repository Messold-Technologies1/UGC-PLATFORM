import {
  benchmarkSignals,
  compareSignals,
  CreatorRankingService,
  RankSignals,
} from './creator-ranking.service';

const NOW = new Date('2026-10-29T04:00:00.000Z');
const daysBefore = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

/** A signals tuple with the fields left out zeroed. */
const sig = (partial: Partial<RankSignals>): RankSignals => ({
  completedOrders: 0,
  initiatedCheckouts: 0,
  addToCarts: 0,
  wishlistAdds: 0,
  profileViews: 0,
  ...partial,
});

type Creator = { id: string; createdAt: Date };

/**
 * A prisma double shaped to the four reads rankListedCreators makes.
 *
 * `orderGroups` is consulted twice — once filtered to the completed statuses
 * and once not — so it is keyed on whether the query carried a status filter,
 * which is what tells completed orders from checkouts.
 */
function prismaDouble(opts: {
  creators: Creator[];
  completed?: Record<string, number>;
  checkouts?: Record<string, number>;
  engagement?: Record<
    string,
    { profileViews?: number; addToCarts?: number; wishlistAdds?: number }
  >;
  features?: Array<{
    creatorId: string;
    rank: number;
    featuredUntil: Date | null;
  }>;
}) {
  const counts = (map: Record<string, number> = {}) =>
    Object.entries(map).map(([creatorId, n]) => ({
      creatorId,
      _count: { _all: n },
    }));

  const double = {
    creatorProfile: {
      findMany: jest.fn().mockResolvedValue(opts.creators),
    },
    order: {
      groupBy: jest.fn((args: { where?: { status?: unknown } }) =>
        Promise.resolve(
          args?.where?.status ? counts(opts.completed) : counts(opts.checkouts),
        ),
      ),
    },
    creatorEngagementDaily: {
      groupBy: jest.fn().mockResolvedValue(
        Object.entries(opts.engagement ?? {}).map(([creatorId, sums]) => ({
          creatorId,
          _sum: {
            profileViews: sums.profileViews ?? 0,
            addToCarts: sums.addToCarts ?? 0,
            wishlistAdds: sums.wishlistAdds ?? 0,
          },
        })),
      ),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    creatorFeature: {
      findMany: jest.fn().mockResolvedValue(opts.features ?? []),
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(),
  };
  // The interactive form hands the callback a client with the same delegates,
  // so the double stands in for itself.
  double.$transaction.mockImplementation((fn: unknown) =>
    typeof fn === 'function'
      ? (fn as (tx: unknown) => Promise<unknown>)(double)
      : Promise.resolve(fn),
  );
  return double;
}

const make = (prisma: unknown) => new CreatorRankingService(prisma as never);

describe('compareSignals', () => {
  it('lets one completed order beat any amount of everything below it', () => {
    const oneOrder = sig({ completedOrders: 1 });
    const everythingElse = sig({
      initiatedCheckouts: 500,
      addToCarts: 900,
      wishlistAdds: 900,
      profileViews: 100_000,
    });
    expect(compareSignals(oneOrder, everythingElse)).toBeGreaterThan(0);
  });

  it('consults the next signal only on a tie in the one above', () => {
    const a = sig({ completedOrders: 2, initiatedCheckouts: 3, addToCarts: 0 });
    const b = sig({
      completedOrders: 2,
      initiatedCheckouts: 9,
      addToCarts: 50,
    });
    // Level on orders, so checkouts decide it and carts never get a say.
    expect(compareSignals(a, b)).toBeLessThan(0);

    const c = sig({ completedOrders: 2, initiatedCheckouts: 3, addToCarts: 7 });
    const d = sig({ completedOrders: 2, initiatedCheckouts: 3, addToCarts: 1 });
    expect(compareSignals(c, d)).toBeGreaterThan(0);
  });

  it('is 0 only when all five are level', () => {
    expect(compareSignals(sig({}), sig({}))).toBe(0);
    expect(
      compareSignals(sig({ profileViews: 4 }), sig({ profileViews: 4 })),
    ).toBe(0);
    expect(
      compareSignals(sig({ profileViews: 4 }), sig({ profileViews: 3 })),
    ).toBeGreaterThan(0);
  });
});

describe('benchmarkSignals', () => {
  it('is all zeroes when there is nobody to measure against', () => {
    expect(benchmarkSignals([], 0.75)).toEqual(sig({}));
  });

  it('takes one creator’s counts whole, at the nearest rank', () => {
    const all = [
      sig({ completedOrders: 3 }),
      sig({ initiatedCheckouts: 8 }),
      sig({ profileViews: 40 }),
      sig({}),
    ];
    // Ascending: none, views, checkouts, orders. ceil(0.75 * 4) - 1 = 2.
    expect(benchmarkSignals(all, 0.75)).toEqual(sig({ initiatedCheckouts: 8 }));
    expect(benchmarkSignals([sig({ addToCarts: 5 })], 0.75)).toEqual(
      sig({ addToCarts: 5 }),
    );
  });
});

describe('CreatorRankingService.rankListedCreators', () => {
  const established = { id: 'c-old', createdAt: daysBefore(400) };

  it('puts orders first, and nothing below makes up for one', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'views', createdAt: daysBefore(200) },
          { id: 'one-order', createdAt: daysBefore(200) },
          { id: 'saves', createdAt: daysBefore(200) },
        ],
        completed: { 'one-order': 1 },
        checkouts: { 'one-order': 1 },
        engagement: {
          views: { profileViews: 5000 },
          saves: { wishlistAdds: 900, addToCarts: 400 },
        },
      }),
    );

    const ranked = await service.rankListedCreators(NOW);

    // Under the old weighted score 5000 views would have buried the single
    // order. Read strictly, the order wins outright and the two with none are
    // then separated by carts before saves.
    expect(ranked.map((r) => r.creatorId)).toEqual([
      'one-order',
      'saves',
      'views',
    ]);
  });

  it('breaks a tie on orders with checkouts, not with the softer signals', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'busy-funnel', createdAt: daysBefore(200) },
          { id: 'popular', createdAt: daysBefore(200) },
        ],
        completed: { 'busy-funnel': 2, popular: 2 },
        checkouts: { 'busy-funnel': 9, popular: 2 },
        engagement: { popular: { profileViews: 9000, wishlistAdds: 300 } },
      }),
    );

    const ranked = await service.rankListedCreators(NOW);

    expect(ranked.map((r) => r.creatorId)).toEqual(['busy-funnel', 'popular']);
  });

  it('counts a completed order as a checkout too, not instead of one', async () => {
    const service = make(
      prismaDouble({
        creators: [{ id: 'c1', createdAt: daysBefore(200) }],
        completed: { c1: 1 },
        checkouts: { c1: 1 },
      }),
    );

    const [entry] = await service.rankListedCreators(NOW);

    expect(entry.signals).toMatchObject({
      completedOrders: 1,
      initiatedCheckouts: 1,
    });
  });

  it('floors a newly listed creator into the top quarter', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'top', createdAt: daysBefore(300) },
          { id: 'mid', createdAt: daysBefore(300) },
          { id: 'low', createdAt: daysBefore(300) },
          { id: 'zero', createdAt: daysBefore(300) },
          { id: 'newbie', createdAt: daysBefore(3) },
        ],
        engagement: {
          top: { profileViews: 400 },
          mid: { profileViews: 200 },
          low: { profileViews: 100 },
        },
      }),
    );

    const ranked = await service.rankListedCreators(NOW);
    const newbie = ranked.find((r) => r.creatorId === 'newbie')!;

    // A quarter of the way down [400, 200, 100, 0] is `mid`, so the newcomer
    // is lent 200 views, ties `mid` and lands above it on the newer-first
    // tiebreak — not last, where nobody would ever see them.
    expect(newbie.isNew).toBe(true);
    expect(newbie.ranksAs).toEqual(sig({ profileViews: 200 }));
    // Lent for the ordering only; what they actually drew is still nothing.
    expect(newbie.signals).toEqual(sig({}));
    expect(ranked.map((r) => r.creatorId)).toEqual([
      'top',
      'newbie',
      'mid',
      'low',
      'zero',
    ]);
  });

  it('leaves a newcomer who has already beaten the floor on their own counts', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'est-a', createdAt: daysBefore(300) },
          { id: 'est-b', createdAt: daysBefore(300) },
          { id: 'fast-start', createdAt: daysBefore(3) },
        ],
        completed: { 'fast-start': 1 },
        checkouts: { 'fast-start': 1 },
        engagement: { 'est-a': { profileViews: 50 } },
      }),
    );

    const ranked = await service.rankListedCreators(NOW);
    const newbie = ranked.find((r) => r.creatorId === 'fast-start')!;

    expect(newbie.ranksAs).toEqual(newbie.signals);
    expect(ranked[0].creatorId).toBe('fast-start');
  });

  it('does not let a cohort of newcomers lift each other', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'n1', createdAt: daysBefore(2) },
          { id: 'n2', createdAt: daysBefore(1) },
        ],
      }),
    );

    const ranked = await service.rankListedCreators(NOW);

    // Nobody established to be in the top quarter of, so the floor is all
    // zeroes and they simply order newest-first.
    expect(ranked.every((r) => r.ranksAs.completedOrders === 0)).toBe(true);
    expect(ranked.map((r) => r.creatorId)).toEqual(['n2', 'n1']);
  });

  it('puts a live featured placement first, whatever it drew', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'earner', createdAt: daysBefore(300) },
          { id: 'promoted', createdAt: daysBefore(300) },
        ],
        completed: { earner: 10 },
        checkouts: { earner: 10 },
        features: [
          { creatorId: 'promoted', rank: 1, featuredUntil: daysBefore(-7) },
        ],
      }),
    );

    const ranked = await service.rankListedCreators(NOW);

    expect(ranked[0].creatorId).toBe('promoted');
    expect(ranked[0].isPinned).toBe(true);
    expect(ranked[0].signals).toEqual(sig({}));
  });

  it('treats an expired featured placement as ordinary', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'earner', createdAt: daysBefore(300) },
          { id: 'expired', createdAt: daysBefore(300) },
        ],
        completed: { earner: 1 },
        checkouts: { earner: 1 },
        features: [
          { creatorId: 'expired', rank: 1, featuredUntil: daysBefore(1) },
        ],
      }),
    );

    const ranked = await service.rankListedCreators(NOW);

    expect(ranked.map((r) => r.creatorId)).toEqual(['earner', 'expired']);
    expect(ranked[1].isPinned).toBe(false);
  });

  it('returns nothing when no creator is listed', async () => {
    const service = make(prismaDouble({ creators: [] }));
    await expect(service.rankListedCreators(NOW)).resolves.toEqual([]);
  });

  it('ignores a listed creator with no activity rather than dropping them', async () => {
    const service = make(prismaDouble({ creators: [established] }));
    const ranked = await service.rankListedCreators(NOW);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].signals).toEqual(sig({}));
  });
});

describe('CreatorRankingService.reshuffleBrowseOrder', () => {
  it('writes a contiguous rank per creator and leaves a pin where it is', async () => {
    const prisma = prismaDouble({
      creators: [
        { id: 'promoted', createdAt: daysBefore(300) },
        { id: 'a', createdAt: daysBefore(300) },
        { id: 'b', createdAt: daysBefore(300) },
      ],
      completed: { a: 3 },
      checkouts: { a: 3 },
      features: [
        { creatorId: 'promoted', rank: 1, featuredUntil: daysBefore(-7) },
      ],
    });
    const service = make(prisma);

    const result = await service.reshuffleBrowseOrder(NOW);

    expect(result).toMatchObject({ ranked: 3, pinned: 1, newCreators: 0 });
    // The pin is stamped but never re-ranked — moving it is the one thing the
    // pin exists to prevent.
    expect(prisma.creatorFeature.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { creatorId: 'promoted' } }),
    );
    const pinWrite = prisma.creatorFeature.updateMany.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(pinWrite.data).not.toHaveProperty('rank');

    const ranks = prisma.creatorFeature.upsert.mock.calls.map(
      (call) =>
        (call[0] as { create: { creatorId: string; rank: number } }).create,
    );
    expect(ranks).toEqual([
      { creatorId: 'a', rank: 2, autoRankedAt: NOW },
      { creatorId: 'b', rank: 3, autoRankedAt: NOW },
    ]);
  });
});
