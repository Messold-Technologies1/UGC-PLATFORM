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
      hadLapsedSession: false,
      resultCount: 7,
    });
    await flush();

    expect(create).toHaveBeenCalledWith({
      data: {
        actorUserId: 'user-1',
        // Resolved from the user's OWN brand profile: a brand browsing its own
        // workspace sends no active-brand header.
        brandProfileId: 'brand-1',
        agencyId: null,
        audience: 'BRAND',
        filters: { city: 'Delhi', contentCategory: ['beauty'] },
        filterKeys: ['city', 'contentCategory'],
        resultCount: 7,
      },
    });
  });

  it('files a lapsed session as LAPSED, not as a guest', async () => {
    // Nobody can reach the filter bar without signing in, so a GUEST row is a
    // bug rather than a user. OptionalJwtAuthGuard ignores a token it cannot
    // verify and answers 200, which made a brand whose 15-minute token aged
    // out mid-session look like a stranger.
    const { service, create } = setup();

    service.record({
      query: q({ city: 'Pune' }),
      actorUserId: null,
      activeBrandProfileId: null,
      hadLapsedSession: true,
      resultCount: 3,
    });
    await flush();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ audience: 'LAPSED' }),
      }),
    );
  });

  it('labels a signed-out visitor GUEST without touching the user table', async () => {
    const { service, create, findUnique } = setup();

    service.record({
      query: q({ city: 'Pune' }),
      actorUserId: null,
      activeBrandProfileId: null,
      hadLapsedSession: false,
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

  it('records an agency against the brand it is acting for, and itself', async () => {
    const { service, create } = setup(jest.fn().mockResolvedValue({}), {
      primaryRole: { name: 'AGENCY' },
      userRoles: [{ role: { name: 'AGENCY' } }],
      brandProfile: null,
      ownedAgency: { id: 'agency-1' },
    });

    service.record({
      query: q({ city: 'Goa' }),
      actorUserId: 'agency-user',
      activeBrandProfileId: 'brand-99',
      hadLapsedSession: false,
      resultCount: 1,
    });
    await flush();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          audience: 'AGENCY',
          // Owned by the brand it acted for...
          brandProfileId: 'brand-99',
          // ...and attributed to the agency that did the searching, so the
          // work does not read as the brand's own.
          agencyId: 'agency-1',
        }),
      }),
    );
  });

  it('records an agency browsing its own workspace, with no brand', async () => {
    const { service, create } = setup(jest.fn().mockResolvedValue({}), {
      primaryRole: { name: 'AGENCY' },
      userRoles: [{ role: { name: 'AGENCY' } }],
      brandProfile: null,
      ownedAgency: { id: 'agency-1' },
    });

    service.record({
      query: q({ city: 'Goa' }),
      actorUserId: 'agency-user',
      activeBrandProfileId: null,
      hadLapsedSession: false,
      resultCount: 1,
    });
    await flush();

    // Before agencyId existed this row carried no identity at all and
    // vanished from the breakdown entirely.
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          brandProfileId: null,
          agencyId: 'agency-1',
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
      hadLapsedSession: false,
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
        hadLapsedSession: false,
        resultCount: 0,
      }),
    ).not.toThrow();

    await flush();
    expect(create).toHaveBeenCalled();
  });
});


describe('CreatorSearchAnalyticsService.actorBreakdown', () => {
  function setup(events: unknown[], brands: unknown[], agencies: unknown[] = []) {
    const prisma = {
      creatorSearchEvent: { findMany: jest.fn().mockResolvedValue(events) },
      brandProfile: { findMany: jest.fn().mockResolvedValue(brands) },
      agency: { findMany: jest.fn().mockResolvedValue(agencies) },
    } as unknown as PrismaService;
    return new CreatorSearchAnalyticsService(prisma);
  }

  const at = (iso: string) => new Date(iso);

  it('groups by brand, ranks by searches, and keeps the values chosen', async () => {
    const service = setup(
      [
        // Newest first, as the query orders them.
        { brandProfileId: 'b1', agencyId: null, filterKeys: ['city'], filters: { city: 'Mumbai' }, resultCount: 3, createdAt: at('2026-11-05T10:00:00Z') },
        { brandProfileId: 'b1', agencyId: null, filterKeys: ['city', 'gender'], filters: { city: 'Delhi', gender: 'FEMALE' }, resultCount: 0, createdAt: at('2026-11-04T10:00:00Z') },
        { brandProfileId: 'b2', agencyId: null, filterKeys: ['minPrice'], filters: { minPrice: 500 }, resultCount: 9, createdAt: at('2026-11-03T10:00:00Z') },
      ],
      [
        { id: 'b1', brandName: '  Twyn Digital  ', contactFullName: 'Sakshi Saini' },
        { id: 'b2', brandName: null, contactFullName: 'Disha Gupta' },
      ],
    );

    const rows = await service.actorBreakdown({});

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      actorId: 'b1',
      kind: 'BRAND',
      label: 'Twyn Digital',
      searches: 2,
      zeroResultSearches: 1,
      onBehalfOf: [],
      lastSearchedAt: '2026-11-05T10:00:00.000Z',
    });
    expect(rows[0].filters[0]).toEqual({
      key: 'city',
      searches: 2,
      topValues: ['Mumbai', 'Delhi'],
    });
    // No brandName — a person's name beats showing a raw uuid or an address.
    expect(rows[1].label).toBe('Disha Gupta');
  });

  it('gives an agency its own row, named after the agency', async () => {
    const service = setup(
      [
        // Acting inside a brand's workspace: owned by the brand, attributed
        // to the agency that did the searching.
        { brandProfileId: 'b1', agencyId: 'ag1', filterKeys: ['city'], filters: { city: 'Goa' }, resultCount: 2, createdAt: at('2026-11-05T10:00:00Z') },
        // Same agency, its own workspace, no brand at all. Before agencyId
        // existed this row had no actor and vanished from the breakdown.
        { brandProfileId: null, agencyId: 'ag1', filterKeys: ['language'], filters: { language: ['telugu'] }, resultCount: 0, createdAt: at('2026-11-04T10:00:00Z') },
      ],
      [{ id: 'b1', brandName: 'Nike', contactFullName: null }],
      [{ id: 'ag1', name: 'Messold' }],
    );

    const rows = await service.actorBreakdown({});

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actorId: 'ag1',
      kind: 'AGENCY',
      label: 'Messold',
      searches: 2,
      zeroResultSearches: 1,
      // The brand it was acting for, by name — and only where there was one.
      onBehalfOf: ['Nike'],
    });
  });

  it('names a brand whose profile has since been removed', async () => {
    const service = setup(
      [{ brandProfileId: 'gone-1234-5678', agencyId: null, filterKeys: [], filters: {}, resultCount: 1, createdAt: at('2026-11-05T10:00:00Z') }],
      [],
    );

    const rows = await service.actorBreakdown({});

    // The rows outlive the profile; dropping them would silently lose history.
    expect(rows[0].label).toContain('removed');
    expect(rows[0].searches).toBe(1);
  });
});
