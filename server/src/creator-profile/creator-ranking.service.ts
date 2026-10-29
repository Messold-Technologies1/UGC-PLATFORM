import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  BROWSE_RESHUFFLE_CRON,
  ENGAGEMENT_RETENTION_DAYS,
  RANK_COMPLETED_ORDER_STATUSES,
  RANK_NEW_CREATOR_DAYS,
  RANK_NEW_CREATOR_PERCENTILE,
  RANK_SIGNAL_ORDER,
  RANK_WINDOW_DAYS,
} from './creator-ranking.constants';

/** The five counts a creator is ordered on, strongest first. */
export type RankSignals = Record<(typeof RANK_SIGNAL_ORDER)[number], number>;

/** One creator's standing, as the reshuffle worked it out. */
export type CreatorRankEntry = {
  creatorId: string;
  /** What the creator actually drew in the window. */
  signals: RankSignals;
  /**
   * The counts they were ordered on. The same as {@link signals} for everyone
   * but a newcomer carried by the floor, who is ranked on the borrowed counts
   * instead — keeping both means the board can say what a creator did as well
   * as why they are where they are.
   */
  ranksAs: RankSignals;
  /** Listed recently enough to be carried by the new-creator floor. */
  isNew: boolean;
  /** Held in place by a featuredUntil that has not passed. */
  isPinned: boolean;
};

export type ReshuffleResult = {
  ranked: number;
  pinned: number;
  newCreators: number;
  ranAt: Date;
};

const dayStartUtc = (date: Date): Date =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const daysAgo = (from: Date, days: number): Date =>
  new Date(from.getTime() - days * 24 * 60 * 60 * 1000);

const ZERO_SIGNALS: RankSignals = {
  completedOrders: 0,
  initiatedCheckouts: 0,
  addToCarts: 0,
  wishlistAdds: 0,
  profileViews: 0,
};

/**
 * Recomputes the order brands see on Browse creators, every fortnight, from
 * what brands did with each creator over the last quarter.
 *
 * The five signals are read strictly in order — completed orders, then
 * initiated checkouts, then add-to-carts, then wishlist saves, then profile
 * views — and never traded off against each other. One completed order puts a
 * creator above everyone with none, whatever the rest of their numbers say;
 * the next signal only breaks a tie on the one above it. See
 * {@link compareSignals}.
 *
 * The board an admin drags is the same ordering, so a reshuffle replaces what
 * was dragged — that is the intent, not a side effect. Dragging still works
 * between runs and still takes effect immediately; it just does not survive
 * the next reshuffle. The one exception is a creator holding a `featuredUntil`
 * in the future, who keeps their position until it passes, so a promotional
 * placement is not quietly undone a fortnight after it is set.
 */
@Injectable()
export class CreatorRankingService {
  private readonly logger = new Logger(CreatorRankingService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService) {}

  @Cron(BROWSE_RESHUFFLE_CRON)
  async scheduledReshuffle(): Promise<void> {
    if (this.running) {
      this.logger.warn('reshuffle already running; skipping this tick');
      return;
    }
    this.running = true;
    try {
      const result = await this.reshuffleBrowseOrder();
      this.logger.log(
        `browse order reshuffled: ${result.ranked} creators (${result.pinned} pinned, ${result.newCreators} new)`,
      );
      await this.pruneEngagementHistory();
    } catch (err) {
      // A failed reshuffle leaves the previous order in place, which is a
      // working board — so this logs and waits for the next run rather than
      // taking the process down.
      this.logger.error(
        `browse order reshuffle failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.running = false;
    }
  }

  /**
   * Read every listed creator's standing, then write the order out.
   *
   * Exposed so an admin can trigger a run, and so the preview endpoint can
   * show what the next one would do without doing it.
   */
  async reshuffleBrowseOrder(now = new Date()): Promise<ReshuffleResult> {
    const entries = await this.rankListedCreators(now);

    const ranked = entries.map((entry, index) => ({
      creatorId: entry.creatorId,
      rank: index + 1,
      isPinned: entry.isPinned,
    }));

    await this.prisma.$transaction(
      async (tx) => {
        for (const row of ranked) {
          // A pinned creator keeps the rank and the expiry they were given, so
          // the run only stamps when it saw them — writing `rank` here would
          // move them, which is the one thing the pin exists to prevent.
          if (row.isPinned) {
            await tx.creatorFeature.updateMany({
              where: { creatorId: row.creatorId },
              data: { autoRankedAt: now },
            });
            continue;
          }
          await tx.creatorFeature.upsert({
            where: { creatorId: row.creatorId },
            create: {
              creatorId: row.creatorId,
              rank: row.rank,
              autoRankedAt: now,
            },
            update: {
              rank: row.rank,
              autoRankedAt: now,
              // An expiry that has already passed is spent; clearing it keeps
              // the pinned check below reading only live promotions.
              featuredUntil: null,
            },
          });
        }
      },
      { timeout: 120_000 },
    );

    return {
      ranked: ranked.length,
      pinned: entries.filter((e) => e.isPinned).length,
      newCreators: entries.filter((e) => e.isNew).length,
      ranAt: now,
    };
  }

  /**
   * Every listed creator in the order the next reshuffle would put them in,
   * best first. Pure: reads, compares, sorts, writes nothing.
   */
  async rankListedCreators(now = new Date()): Promise<CreatorRankEntry[]> {
    const since = daysAgo(now, RANK_WINDOW_DAYS);
    const newSince = daysAgo(now, RANK_NEW_CREATOR_DAYS);

    const creators = await this.prisma.creatorProfile.findMany({
      where: { isListed: true },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    if (creators.length === 0) return [];

    const creatorIds = creators.map((c) => c.id);

    const [completedRows, checkoutRows, engagementRows, featureRows] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ['creatorId'],
          where: {
            creatorId: { in: creatorIds },
            status: { in: RANK_COMPLETED_ORDER_STATUSES },
            createdAt: { gte: since },
          },
          _count: { _all: true },
          orderBy: { creatorId: 'asc' },
        }),
        // Every order row is a checkout that was initiated, whatever became of
        // it — including the unpaid drafts the inbox hides.
        this.prisma.order.groupBy({
          by: ['creatorId'],
          where: { creatorId: { in: creatorIds }, createdAt: { gte: since } },
          _count: { _all: true },
          orderBy: { creatorId: 'asc' },
        }),
        this.prisma.creatorEngagementDaily.groupBy({
          by: ['creatorId'],
          where: {
            creatorId: { in: creatorIds },
            day: { gte: dayStartUtc(since) },
          },
          _sum: { profileViews: true, addToCarts: true, wishlistAdds: true },
          orderBy: { creatorId: 'asc' },
        }),
        this.prisma.creatorFeature.findMany({
          where: { creatorId: { in: creatorIds } },
          select: { creatorId: true, rank: true, featuredUntil: true },
        }),
      ]);

    const countOf = (rows: Array<{ creatorId: string; _count: unknown }>) =>
      new Map(
        rows.map((row) => [
          row.creatorId,
          typeof row._count === 'object' && row._count !== null
            ? ((row._count as { _all?: number })._all ?? 0)
            : 0,
        ]),
      );

    const completed = countOf(completedRows);
    const checkouts = countOf(checkoutRows);
    const engagement = new Map(
      engagementRows.map((r) => [r.creatorId, r._sum]),
    );
    const pinnedRank = new Map(
      featureRows
        .filter((f) => f.featuredUntil !== null && f.featuredUntil > now)
        .map((f) => [f.creatorId, f.rank]),
    );

    const scored = creators.map((creator) => {
      const sums = engagement.get(creator.id);
      const signals = {
        completedOrders: completed.get(creator.id) ?? 0,
        initiatedCheckouts: checkouts.get(creator.id) ?? 0,
        addToCarts: sums?.addToCarts ?? 0,
        wishlistAdds: sums?.wishlistAdds ?? 0,
        profileViews: sums?.profileViews ?? 0,
      };
      return {
        creatorId: creator.id,
        createdAt: creator.createdAt,
        signals,
        isNew: creator.createdAt >= newSince,
        isPinned: pinnedRank.has(creator.id),
      };
    });

    // The floor is read off creators who are not themselves new, so a cohort
    // of newcomers cannot lift each other: with nobody established to stand a
    // quarter of the way down, there is nothing to be in the top quarter of
    // and the floor is all zeroes, which lifts nobody.
    const floor = benchmarkSignals(
      scored.filter((c) => !c.isNew).map((c) => c.signals),
      RANK_NEW_CREATOR_PERCENTILE,
    );

    const entries: CreatorRankEntry[] = scored.map((c) => ({
      creatorId: c.creatorId,
      signals: c.signals,
      // Lent the floor only where it is actually better; a newcomer who has
      // already outdone it keeps their own counts and the position they bought.
      ranksAs:
        c.isNew && compareSignals(floor, c.signals) > 0 ? floor : c.signals,
      isNew: c.isNew,
      isPinned: c.isPinned,
    }));

    const createdAtById = new Map(
      scored.map((c) => [c.creatorId, c.createdAt]),
    );

    return entries.sort((a, b) => {
      // Promotional placements come first and in the order they were given, so
      // a reshuffle never moves one of them past another.
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isPinned && b.isPinned) {
        return (
          (pinnedRank.get(a.creatorId) ?? 0) -
          (pinnedRank.get(b.creatorId) ?? 0)
        );
      }
      const bySignal = compareSignals(b.ranksAs, a.ranksAs);
      if (bySignal !== 0) return bySignal;
      // Level on all five — the newer one goes first, which is what the board
      // did for everyone before it was ranked.
      const aAt = createdAtById.get(a.creatorId)?.getTime() ?? 0;
      const bAt = createdAtById.get(b.creatorId)?.getTime() ?? 0;
      if (bAt !== aAt) return bAt - aAt;
      return a.creatorId.localeCompare(b.creatorId);
    });
  }

  /** Drop engagement days older than the retention window. */
  async pruneEngagementHistory(now = new Date()): Promise<number> {
    const { count } = await this.prisma.creatorEngagementDaily.deleteMany({
      where: {
        day: { lt: dayStartUtc(daysAgo(now, ENGAGEMENT_RETENTION_DAYS)) },
      },
    });
    if (count > 0) {
      this.logger.log(`pruned ${count} engagement day rows past retention`);
    }
    return count;
  }
}

/**
 * Which of two creators the board puts first, read strictly down
 * {@link RANK_SIGNAL_ORDER}: positive when `a` outranks `b`, 0 when the two are
 * level on all five.
 *
 * No signal can be traded against another. More completed orders wins, full
 * stop; the next line is consulted only on a tie, and so on down. That is the
 * whole difference from a weighted score, where enough profile views could
 * stand in for an order.
 */
export function compareSignals(a: RankSignals, b: RankSignals): number {
  for (const signal of RANK_SIGNAL_ORDER) {
    const diff = (a[signal] ?? 0) - (b[signal] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * The counts of whoever stands `fraction` of the way up `all`, which is what a
 * newcomer is lent.
 *
 * The nearest-rank percentile, taken over the whole tuple rather than a number:
 * the list is ordered by {@link compareSignals} and one creator's counts are
 * read off it whole, so the floor is a position a real creator holds rather
 * than a tuple assembled from five different people. All zeroes when there is
 * nobody to measure against.
 */
export function benchmarkSignals(
  all: RankSignals[],
  fraction: number,
): RankSignals {
  if (all.length === 0) return ZERO_SIGNALS;
  const ascending = [...all].sort(compareSignals);
  const index = Math.ceil(fraction * ascending.length) - 1;
  return ascending[Math.min(Math.max(index, 0), ascending.length - 1)];
}
