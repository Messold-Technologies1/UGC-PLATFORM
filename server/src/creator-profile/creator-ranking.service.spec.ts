import {
  CreatorRankingService,
  percentile,
  scoreOf,
} from './creator-ranking.service';
import { RANK_WEIGHTS } from './creator-ranking.constants';

const NOW = new Date('2026-10-29T04:00:00.000Z');
const daysBefore = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

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

describe('scoreOf', () => {
  it('pays an order more than four checkouts and a hundred views', () => {
    const order = scoreOf({
      completedOrders: 1,
      initiatedCheckouts: 0,
      addToCarts: 0,
      wishlistAdds: 0,
      profileViews: 0,
    });
    expect(order).toBe(RANK_WEIGHTS.completedOrder);
    expect(order).toBeGreaterThan(RANK_WEIGHTS.initiatedCheckout * 3);
    expect(order).toBe(RANK_WEIGHTS.profileView * 100);
  });

  it('adds every signal rather than taking the strongest', () => {
    expect(
      scoreOf({
        completedOrders: 2,
        initiatedCheckouts: 3,
        addToCarts: 4,
        wishlistAdds: 5,
        profileViews: 6,
      }),
    ).toBe(200 + 75 + 40 + 25 + 6);
  });
});

describe('percentile', () => {
  it('is 0 when there is nothing to measure', () => {
    expect(percentile([], 0.75)).toBe(0);
  });

  it('takes the nearest rank at or above the fraction', () => {
    expect(percentile([0, 10, 20, 30], 0.75)).toBe(20);
    expect(percentile([5], 0.75)).toBe(5);
  });
});

describe('CreatorRankingService.rankListedCreators', () => {
  const established = { id: 'c-old', createdAt: daysBefore(400) };

  it('orders by weighted score, best first', async () => {
    const service = make(
      prismaDouble({
        creators: [
          { id: 'views', createdAt: daysBefore(200) },
          { id: 'orders', createdAt: daysBefore(200) },
          { id: 'saves', createdAt: daysBefore(200) },
        ],
        completed: { orders: 2 },
        checkouts: { orders: 2 },
        engagement: {
          views: { profileViews: 120 },
          saves: { wishlistAdds: 30 },
        },
      }),
    );

    const ranked = await service.rankListedCreators(NOW);

    // orders: 2*100 + 2*25 = 250, views: 120, saves: 150
    expect(ranked.map((r) => r.creatorId)).toEqual([
      'orders',
      'saves',
      'views',
    ]);
    expect(ranked[0].score).toBe(250);
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
    expect(entry.score).toBe(
      RANK_WEIGHTS.completedOrder + RANK_WEIGHTS.initiatedCheckout,
    );
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

    // 75th percentile of [0, 100, 200, 400] is 200, so the newcomer ties `mid`
    // and lands above it on the newer-first tiebreak — not last, where nobody
    // would ever see them.
    expect(newbie.isNew).toBe(true);
    expect(newbie.score).toBe(200);
    expect(ranked.map((r) => r.creatorId)).toEqual([
      'top',
      'newbie',
      'mid',
      'low',
      'zero',
    ]);
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

    // Nobody established to be in the top quarter of, so the floor is 0 and
    // they simply order newest-first.
    expect(ranked.every((r) => r.score === 0)).toBe(true);
    expect(ranked.map((r) => r.creatorId)).toEqual(['n2', 'n1']);
  });

  it('puts a live featured placement first, whatever it scored', async () => {
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
    expect(ranked[0].score).toBe(0);
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
    expect(ranked[0].score).toBe(0);
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
    // The pin is scored but never re-ranked — moving it is the one thing the
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
      { creatorId: 'a', rank: 2, autoRankScore: 375, autoRankedAt: NOW },
      { creatorId: 'b', rank: 3, autoRankScore: 0, autoRankedAt: NOW },
    ]);
  });
});
