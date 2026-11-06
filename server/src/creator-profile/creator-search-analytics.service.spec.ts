import {
  CreatorSearchAnalyticsService,
  extractActiveFilters,
} from './creator-search-analytics.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { ListCreatorsQueryDto } from './dto/list-creators-query.dto';

const q = (o: Partial<ListCreatorsQueryDto>) => o as ListCreatorsQueryDto;

describe('extractActiveFilters', () => {
  it('keeps only filters the brand actually set', () => {
    expect(
      extractActiveFilters(
        q({
          city: 'Mumbai',
          contentCategory: ['fashion'],
          gender: 'FEMALE',
          onLocationAvailable: true,
          minFollowers: 1000,
        }),
      ),
    ).toEqual({
      city: 'Mumbai',
      contentCategory: ['fashion'],
      gender: 'FEMALE',
      onLocationAvailable: true,
      minFollowers: 1000,
    });
  });

  it('drops empty strings, empty arrays and unchecked boxes', () => {
    // These are what an untouched filter bar sends. Counting them would make
    // every filter look equally popular.
    expect(
      extractActiveFilters(
        q({
          city: '',
          search: '   ',
          contentCategory: [],
          onLocationAvailable: false,
        }),
      ),
    ).toEqual({});
  });

  it('ignores paging, which is not filtering', () => {
    expect(extractActiveFilters(q({ page: 3, limit: 20 }))).toEqual({});
  });
});

describe('CreatorSearchAnalyticsService.record', () => {
  function setup(
    create = jest.fn().mockResolvedValue({}),
    user: unknown = {
      primaryRole: { name: 'BRAND' },
      userRoles: [{ role: { name: 'BRAND' } }],
      brandProfile: { id: 'brand-1' },
    },
  ) {
    const findUnique = jest.fn().mockResolvedValue(user);
    const prisma = {
      creatorSearchEvent: { create },
      user: { findUnique },
    } as unknown as PrismaService;
    return {
      prisma,
      service: new CreatorSearchAnalyticsService(prisma),
      create,
      findUnique,
    };
  }

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  it('stores the active filters and their names', async () => {
    const { service, create } = setup();

    service.record({
      query: q({ city: 'Delhi', contentCategory: ['beauty'] }),
      actorUserId: 'user-1',
      activeBrandProfileId: null,
      resultCount: 7,
    });
    await flush();

    expect(create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        // Resolved from the user's OWN brand profile: a brand browsing its own
        // workspace sends no active-brand header.
        brandProfileId: 'brand-1',
        audience: 'BRAND',
        filters: { city: 'Delhi', contentCategory: ['beauty'] },
        filterKeys: ['city', 'contentCategory'],
        resultCount: 7,
      },
    });
  });

  it('labels a signed-out visitor GUEST without touching the user table', async () => {
    const { service, create, findUnique } = setup();

    service.record({
      query: q({ city: 'Pune' }),
      actorUserId: null,
      activeBrandProfileId: null,
      resultCount: 3,
    });
    await flush();

    expect(findUnique).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audience: 'GUEST',
          brandProfileId: null,
        }),
      }),
    );
  });

  it('records an agency against the brand it is acting for', async () => {
    const { service, create } = setup(jest.fn().mockResolvedValue({}), {
      primaryRole: { name: 'AGENCY' },
      userRoles: [{ role: { name: 'AGENCY' } }],
      brandProfile: null,
    });

    service.record({
      query: q({ city: 'Goa' }),
      actorUserId: 'agency-user',
      activeBrandProfileId: 'brand-99',
      resultCount: 1,
    });
    await flush();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audience: 'AGENCY',
          brandProfileId: 'brand-99',
        }),
      }),
    );
  });

  it('does not count a creator or admin as a brand', async () => {
    const { service, create } = setup(jest.fn().mockResolvedValue({}), {
      primaryRole: { name: 'CREATOR' },
      userRoles: [{ role: { name: 'CREATOR' } }],
      brandProfile: null,
    });

    service.record({
      query: q({ city: 'Kochi' }),
      actorUserId: 'creator-user',
      activeBrandProfileId: null,
      resultCount: 5,
    });
    await flush();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ audience: 'OTHER' }),
      }),
    );
  });

  it('never throws when the write fails', async () => {
    // Discovery is the hottest read path on the platform. An analytics write
    // that rejects must not surface as a failed browse.
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const { service } = setup(create);

    expect(() =>
      service.record({
        query: q({ city: 'Pune' }),
        actorUserId: null,
        activeBrandProfileId: null,
        resultCount: 0,
      }),
    ).not.toThrow();

    await flush();
    expect(create).toHaveBeenCalled();
  });
});


describe('CreatorSearchAnalyticsService.brandBreakdown', () => {
  function setup(events: unknown[], profiles: unknown[]) {
    const prisma = {
      creatorSearchEvent: { findMany: jest.fn().mockResolvedValue(events) },
      brandProfile: { findMany: jest.fn().mockResolvedValue(profiles) },
    } as unknown as PrismaService;
    return new CreatorSearchAnalyticsService(prisma);
  }

  const at = (iso: string) => new Date(iso);

  it('groups by brand, ranks by searches, and keeps the values chosen', async () => {
    const service = setup(
      [
        // Newest first, as the query orders them.
        { brandProfileId: 'b1', filterKeys: ['city'], filters: { city: 'Mumbai' }, resultCount: 3, createdAt: at('2026-11-05T10:00:00Z') },
        { brandProfileId: 'b1', filterKeys: ['city', 'gender'], filters: { city: 'Delhi', gender: 'FEMALE' }, resultCount: 0, createdAt: at('2026-11-04T10:00:00Z') },
        { brandProfileId: 'b2', filterKeys: ['minPrice'], filters: { minPrice: 500 }, resultCount: 9, createdAt: at('2026-11-03T10:00:00Z') },
      ],
      [
        { id: 'b1', brandName: '  Twyn Digital  ', contactEmail: 'a@b.c' },
        { id: 'b2', brandName: null, contactEmail: 'ops@brand.com' },
      ],
    );

    const rows = await service.brandBreakdown({});

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      brandProfileId: 'b1',
      brandLabel: 'Twyn Digital',
      searches: 2,
      zeroResultSearches: 1,
      // Rows arrive newest first, so the first one seen is the latest.
      lastSearchedAt: '2026-11-05T10:00:00.000Z',
    });
    expect(rows[0].filters[0]).toEqual({
      key: 'city',
      searches: 2,
      topValues: ['Mumbai', 'Delhi'],
    });
    // No brandName — falls back to the contact email rather than a raw uuid.
    expect(rows[1].brandLabel).toBe('ops@brand.com');
  });

  it('names a brand whose profile has since been removed', async () => {
    const service = setup(
      [{ brandProfileId: 'gone-1234-5678', filterKeys: [], filters: {}, resultCount: 1, createdAt: at('2026-11-05T10:00:00Z') }],
      [],
    );

    const rows = await service.brandBreakdown({});

    // The rows outlive the profile; dropping them would silently lose history.
    expect(rows[0].brandLabel).toContain('removed');
    expect(rows[0].searches).toBe(1);
  });
});
