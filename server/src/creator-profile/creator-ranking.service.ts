import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import {
  BROWSE_RESHUFFLE_CRON,
  ENGAGEMENT_RETENTION_DAYS,
  RANK_COMPLETED_ORDER_STATUSES,
  RANK_NEW_CREATOR_DAYS,
  RANK_NEW_CREATOR_PERCENTILE,
  RANK_WEIGHTS,
  RANK_WINDOW_DAYS,
} from './creator-ranking.constants';

/** One creator's standing, as the reshuffle worked it out. */
export type CreatorRankEntry = {
  creatorId: string;
  score: number;
  /** Listed recently enough to be carried by the new-creator floor. */
  isNew: boolean;
  /** Held in place by a featuredUntil that has not passed. */
  isPinned: boolean;
  signals: {
    completedOrders: number;
    initiatedCheckouts: number;
    addToCarts: number;
    wishlistAdds: number;
    profileViews: number;
  };
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

/**
 * Recomputes the order brands see on Browse creators, every fortnight, from
 * what brands did with each creator over the last quarter.
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
   * Score every listed creator, then write the order out.
   *
   * Exposed so an admin can trigger a run, and so the preview endpoint can
   * show what the next one would do without doing it.
   */
  async reshuffleBrowseOrder(now = new Date()): Promise<ReshuffleResult> {
    const entries = await this.rankListedCreators(now);

    const ranked = entries.map((entry, index) => ({
      creatorId: entry.creatorId,
      rank: index + 1,
      score: entry.score,
      isPinned: entry.isPinned,
    }));

    await this.prisma.$transaction(
      async (tx) => {
        for (const row of ranked) {
          // A pinned creator keeps the rank and the expiry they were given, so
          // only their score is refreshed — writing `rank` here would move
          // them, which is the one thing the pin exists to prevent.
          if (row.isPinned) {
            await tx.creatorFeature.updateMany({
              where: { creatorId: row.creatorId },
              data: { autoRankScore: row.score, autoRankedAt: now },
            });
            continue;
          }
          await tx.creatorFeature.upsert({
            where: { creatorId: row.creatorId },
            create: {
              creatorId: row.creatorId,
              rank: row.rank,
              autoRankScore: row.score,
              autoRankedAt: now,
            },
            update: {
              rank: row.rank,
              autoRankScore: row.score,
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
   * best first. Pure: reads, scores, sorts, writes nothing.
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
        score: scoreOf(signals),
        isNew: creator.createdAt >= newSince,
        isPinned: pinnedRank.has(creator.id),
      };
    });

    // The floor is read off creators who are not themselves new, so a cohort
    // of newcomers cannot lift each other: with nobody established to measure
    // against there is nothing to be in the top quarter of, and the floor is 0.
    const floor = percentile(
      scored.filter((c) => !c.isNew).map((c) => c.score),
      RANK_NEW_CREATOR_PERCENTILE,
    );

    const entries: CreatorRankEntry[] = scored.map((c) => ({
      creatorId: c.creatorId,
      score: c.isNew ? Math.max(c.score, floor) : c.score,
      isNew: c.isNew,
      isPinned: c.isPinned,
      signals: c.signals,
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
      if (b.score !== a.score) return b.score - a.score;
      // Two creators on the same score — the newer one goes first, which is
      // what the board did for everyone before it was ranked.
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

/** The weighted sum the board is ordered on. */
export function scoreOf(signals: CreatorRankEntry['signals']): number {
  return (
    signals.completedOrders * RANK_WEIGHTS.completedOrder +
    signals.initiatedCheckouts * RANK_WEIGHTS.initiatedCheckout +
    signals.addToCarts * RANK_WEIGHTS.addToCart +
    signals.wishlistAdds * RANK_WEIGHTS.wishlistAdd +
    signals.profileViews * RANK_WEIGHTS.profileView
  );
}

/** Nearest-rank percentile of `values`; 0 when there is nothing to measure. */
export function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.min(Math.max(index, 0), sorted.length - 1)];
}
