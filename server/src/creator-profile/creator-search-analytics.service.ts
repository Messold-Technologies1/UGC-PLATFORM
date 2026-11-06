import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

/**
 * Every filter the browse list understands, in the order the admin view shows
 * them. `page` and `limit` are deliberately absent: they are paging, not
 * filtering, and counting them would drown the real signal.
 */
export const TRACKED_FILTER_KEYS = [
  'search',
  'city',
  'contentCategory',
  'gender',
  'ageGroup',
  'minAge',
  'maxAge',
  'creatorType',
  'appearance',
  'occupation',
  'language',
  'restrictions',
  'onLocationAvailable',
  'minPrice',
  'maxPrice',
  'maxDeliveryDays',
  'minFollowers',
  'maxFollowers',
] as const;

export type TrackedFilterKey = (typeof TRACKED_FILTER_KEYS)[number];

/**
 * Who ran the search. OTHER covers a creator or an admin browsing the list —
 * rare, but it must not be silently counted as a brand.
 */
export type SearchAudience = 'BRAND' | 'AGENCY' | 'GUEST' | 'OTHER';

/** Filters whose value is worth counting one-by-one in the admin view. */
const VALUE_BREAKDOWN_KEYS: TrackedFilterKey[] = [
  'city',
  'contentCategory',
  'gender',
  'ageGroup',
  'creatorType',
  'appearance',
  'occupation',
  'language',
  'restrictions',
  'maxDeliveryDays',
];

const MAX_VALUES_PER_FILTER = 10;
const MAX_SEARCH_TERMS = 20;

/**
 * A filter counts as "used" only when it carries a real value. An empty
 * string, an empty array and `false` on a checkbox all mean the brand left it
 * alone, and recording those would make every filter look equally popular.
 */
function isActive(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  return true;
}

/** The set filters only, as a plain object safe to store as JSON. */
export function extractActiveFilters(
  query: ListCreatorsQueryDto,
): Record<string, unknown> {
  const active: Record<string, unknown> = {};
  for (const key of TRACKED_FILTER_KEYS) {
    const value = (query as unknown as Record<string, unknown>)[key];
    if (isActive(value)) {
      active[key] = value;
    }
  }
  return active;
}

export type FilterUsageRow = {
  key: string;
  searches: number;
  shareOfSearches: number;
  topValues: { value: string; searches: number }[];
};

export type BrandSearchRow = {
  brandProfileId: string;
  /** brandName, falling back to the contact email, then a short id. */
  brandLabel: string;
  searches: number;
  zeroResultSearches: number;
  lastSearchedAt: string;
  filters: { key: string; searches: number; topValues: string[] }[];
};

export type SearchAnalyticsSummary = {
  from: string;
  to: string;
  totalSearches: number;
  /** Searches that set no filter at all — someone just opened the page. */
  unfilteredSearches: number;
  zeroResultSearches: number;
  byAudience: { audience: string; searches: number }[];
  filters: FilterUsageRow[];
  topSearchTerms: { term: string; searches: number }[];
  /** The filter combinations that most often returned nothing. */
  topZeroResultFilters: { key: string; searches: number }[];
};

@Injectable()
export class CreatorSearchAnalyticsService {
  private readonly logger = new Logger(CreatorSearchAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record one search.
   *
   * Never awaited by the browse request: discovery is the hottest read path on
   * the platform and must not wait on, or fail because of, an analytics write.
   * A failure here is logged at debug and dropped.
   *
   * Because nothing waits on it, the audience and the brand are resolved in
   * here rather than in the controller. The request only carries
   * `{ id, email, name }` (JwtAuthGuard puts no roles on it), and the active
   * brand header is sent ONLY by an agency that has switched into a brand — a
   * brand browsing its own workspace sends nothing. Guessing from either in
   * the controller would label every signed-in search BRAND and leave
   * brandProfileId null for the actual brands.
   */
  record(input: {
    query: ListCreatorsQueryDto;
    actorUserId: string | null;
    /** The agency's active-brand header, when there is one. */
    activeBrandProfileId: string | null;
    resultCount: number;
  }): void {
    const filters = extractActiveFilters(input.query);

    void this.resolveActor(input.actorUserId, input.activeBrandProfileId)
      .then((actor) =>
        this.prisma.creatorSearchEvent.create({
          data: {
            actorUserId: input.actorUserId,
            brandProfileId: actor.brandProfileId,
            audience: actor.audience,
            filters: filters as Prisma.InputJsonValue,
            filterKeys: Object.keys(filters),
            resultCount: input.resultCount,
          },
        }),
      )
      .catch((err: unknown) => {
        this.logger.debug(
          `could not record creator search: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
  }

  /**
   * One indexed lookup, off the critical path. An agency acting inside a brand
   * workspace is recorded against that brand, so the brand's own numbers
   * include work its agency did for it.
   */
  private async resolveActor(
    actorUserId: string | null,
    activeBrandProfileId: string | null,
  ): Promise<{ audience: SearchAudience; brandProfileId: string | null }> {
    if (!actorUserId) {
      return { audience: 'GUEST', brandProfileId: null };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: {
        primaryRole: { select: { name: true } },
        userRoles: { select: { role: { select: { name: true } } } },
        brandProfile: { select: { id: true } },
      },
    });

    const roles = new Set<string>();
    if (user?.primaryRole?.name) roles.add(user.primaryRole.name);
    for (const userRole of user?.userRoles ?? []) {
      if (userRole.role?.name) roles.add(userRole.role.name);
    }

    const audience: SearchAudience = roles.has('AGENCY')
      ? 'AGENCY'
      : roles.has('BRAND')
        ? 'BRAND'
        : 'OTHER';

    return {
      audience,
      brandProfileId: activeBrandProfileId ?? user?.brandProfile?.id ?? null,
    };
  }

  async summary(params: {
    from?: Date;
    to?: Date;
    audience?: SearchAudience;
    brandProfileId?: string;
  }): Promise<SearchAnalyticsSummary> {
    const to = params.to ?? new Date();
    const from =
      params.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.CreatorSearchEventWhereInput = {
      createdAt: { gte: from, lte: to },
      ...(params.audience ? { audience: params.audience } : {}),
      ...(params.brandProfileId
        ? { brandProfileId: params.brandProfileId }
        : {}),
    };

    const [totalSearches, zeroResultSearches, audienceGroups, events] =
      await Promise.all([
        this.prisma.creatorSearchEvent.count({ where }),
        this.prisma.creatorSearchEvent.count({
          where: { ...where, resultCount: 0 },
        }),
        this.prisma.creatorSearchEvent.groupBy({
          by: ['audience'],
          where,
          _count: { _all: true },
        }),
        // The per-value and per-term breakdowns need the stored filter payload,
        // which no SQL aggregate can unpack portably, so they are folded in
        // memory. Bounded by `take` rather than unbounded: an admin screen is
        // not worth streaming the whole table for.
        this.prisma.creatorSearchEvent.findMany({
          where,
          select: { filterKeys: true, filters: true, resultCount: true },
          orderBy: { createdAt: 'desc' },
          take: 20_000,
        }),
      ]);

    const keyCounts = new Map<string, number>();
    const zeroResultKeyCounts = new Map<string, number>();
    const valueCounts = new Map<string, Map<string, number>>();
    const termCounts = new Map<string, number>();
    let unfilteredSearches = 0;

    for (const event of events) {
      if (event.filterKeys.length === 0) {
        unfilteredSearches += 1;
      }

      for (const key of event.filterKeys) {
        keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
        if (event.resultCount === 0) {
          zeroResultKeyCounts.set(key, (zeroResultKeyCounts.get(key) ?? 0) + 1);
        }
      }

      const filters = (event.filters ?? {}) as Record<string, unknown>;

      for (const key of VALUE_BREAKDOWN_KEYS) {
        const raw = filters[key];
        if (!isActive(raw)) continue;
        const values = Array.isArray(raw) ? raw : [raw];
        let bucket = valueCounts.get(key);
        if (!bucket) {
          bucket = new Map<string, number>();
          valueCounts.set(key, bucket);
        }
        for (const value of values) {
          const label = String(value).trim();
          if (!label) continue;
          bucket.set(label, (bucket.get(label) ?? 0) + 1);
        }
      }

      const term = filters.search;
      if (typeof term === 'string' && term.trim()) {
        const label = term.trim().toLowerCase();
        termCounts.set(label, (termCounts.get(label) ?? 0) + 1);
      }
    }

    const sampled = events.length || 1;

    const filters: FilterUsageRow[] = TRACKED_FILTER_KEYS.map((key) => {
      const searches = keyCounts.get(key) ?? 0;
      const bucket = valueCounts.get(key);
      return {
        key,
        searches,
        shareOfSearches: Math.round((searches / sampled) * 1000) / 10,
        topValues: bucket
          ? [...bucket.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, MAX_VALUES_PER_FILTER)
              .map(([value, count]) => ({ value, searches: count }))
          : [],
      };
    }).sort((a, b) => b.searches - a.searches);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalSearches,
      unfilteredSearches,
      zeroResultSearches,
      byAudience: audienceGroups
        .map((group) => ({
          audience: group.audience,
          searches: group._count._all,
        }))
        .sort((a, b) => b.searches - a.searches),
      filters,
      topSearchTerms: [...termCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_SEARCH_TERMS)
        .map(([term, searches]) => ({ term, searches })),
      topZeroResultFilters: [...zeroResultKeyCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_VALUES_PER_FILTER)
        .map(([key, searches]) => ({ key, searches })),
    };
  }

  /**
   * Which brand used which filter.
   *
   * Only rows that carry a brand: a signed-out visitor has no brandProfileId,
   * and those are the majority of searches, so they would otherwise collapse
   * into one meaningless "unknown" bucket.
   *
   * Folded in memory for the same reason as `summary`: the per-value detail
   * lives inside the stored JSON payload, which no portable SQL aggregate can
   * unpack.
   */
  async brandBreakdown(params: {
    from?: Date;
    to?: Date;
    limit?: number;
  }): Promise<BrandSearchRow[]> {
    const to = params.to ?? new Date();
    const from =
      params.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

    const events = await this.prisma.creatorSearchEvent.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        brandProfileId: { not: null },
      },
      select: {
        brandProfileId: true,
        filterKeys: true,
        filters: true,
        resultCount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20_000,
    });

    type Acc = {
      searches: number;
      zeroResultSearches: number;
      lastSearchedAt: Date;
      keys: Map<string, number>;
      values: Map<string, Set<string>>;
    };
    const byBrand = new Map<string, Acc>();

    for (const event of events) {
      const brandId = event.brandProfileId;
      if (!brandId) continue;

      let acc = byBrand.get(brandId);
      if (!acc) {
        acc = {
          searches: 0,
          zeroResultSearches: 0,
          // Rows arrive newest first, so the first one seen is the latest.
          lastSearchedAt: event.createdAt,
          keys: new Map(),
          values: new Map(),
        };
        byBrand.set(brandId, acc);
      }

      acc.searches += 1;
      if (event.resultCount === 0) acc.zeroResultSearches += 1;

      const filters = (event.filters ?? {}) as Record<string, unknown>;
      for (const key of event.filterKeys) {
        acc.keys.set(key, (acc.keys.get(key) ?? 0) + 1);

        const raw = filters[key];
        if (!isActive(raw)) continue;
        let bucket = acc.values.get(key);
        if (!bucket) {
          bucket = new Set<string>();
          acc.values.set(key, bucket);
        }
        for (const value of Array.isArray(raw) ? raw : [raw]) {
          const label = String(value).trim();
          if (label && bucket.size < MAX_VALUES_PER_FILTER) bucket.add(label);
        }
      }
    }

    const ranked = [...byBrand.entries()]
      .sort((a, b) => b[1].searches - a[1].searches)
      .slice(0, limit);

    const profiles = await this.prisma.brandProfile.findMany({
      where: { id: { in: ranked.map(([id]) => id) } },
      select: { id: true, brandName: true, contactEmail: true },
    });
    const labels = new Map(
      profiles.map((profile) => [
        profile.id,
        profile.brandName?.trim() ||
          profile.contactEmail?.trim() ||
          `Brand ${profile.id.slice(0, 8)}`,
      ]),
    );

    return ranked.map(([brandProfileId, acc]) => ({
      brandProfileId,
      // A deleted brand still has rows; name it rather than drop the row.
      brandLabel:
        labels.get(brandProfileId) ??
        `Brand ${brandProfileId.slice(0, 8)} (removed)`,
      searches: acc.searches,
      zeroResultSearches: acc.zeroResultSearches,
      lastSearchedAt: acc.lastSearchedAt.toISOString(),
      filters: [...acc.keys.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, searches]) => ({
          key,
          searches,
          topValues: [...(acc.values.get(key) ?? [])],
        })),
    }));
  }

}
