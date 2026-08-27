import { BadRequestException } from '@nestjs/common';
import { IgMediaSyncStatus } from '@prisma/client';
import {
  InstagramMediaService,
  decodeGalleryCursor,
  encodeGalleryCursor,
  isReel,
} from './instagram-media.service';

describe('isReel', () => {
  it('accepts a video whose product type is REELS', () => {
    expect(isReel({ mediaType: 'VIDEO', mediaProductType: 'REELS' })).toBe(
      true,
    );
  });

  it('rejects a feed video, which is not a reel', () => {
    expect(isReel({ mediaType: 'VIDEO', mediaProductType: 'FEED' })).toBe(
      false,
    );
  });

  it('rejects photos and carousels', () => {
    expect(isReel({ mediaType: 'IMAGE', mediaProductType: 'FEED' })).toBe(
      false,
    );
    expect(
      isReel({ mediaType: 'CAROUSEL_ALBUM', mediaProductType: 'FEED' }),
    ).toBe(false);
  });

  it('rejects older media with no product type rather than guessing', () => {
    expect(isReel({ mediaType: 'VIDEO', mediaProductType: null })).toBe(false);
  });
});

describe('gallery cursor', () => {
  it('round-trips a dated item', () => {
    const postedAt = new Date('2026-07-02T04:11:00.000Z');
    const decoded = decodeGalleryCursor(
      encodeGalleryCursor({ postedAt, igMediaId: '17912' }),
    );
    expect(decoded.igMediaId).toBe('17912');
    expect(decoded.postedAt?.toISOString()).toBe(postedAt.toISOString());
  });

  it('round-trips an item with no timestamp', () => {
    const decoded = decodeGalleryCursor(
      encodeGalleryCursor({ postedAt: null, igMediaId: '17913' }),
    );
    expect(decoded).toEqual({ postedAt: null, igMediaId: '17913' });
  });

  it('rejects a malformed cursor instead of returning a bogus keyset', () => {
    expect(() => decodeGalleryCursor('not-base64!!')).toThrow(
      BadRequestException,
    );
    expect(() =>
      decodeGalleryCursor(Buffer.from('{}', 'utf8').toString('base64url')),
    ).toThrow(BadRequestException);
  });
});

describe('InstagramMediaService', () => {
  const connectionId = 'conn-1';
  const userId = 'user-1';

  const prismaMock = {
    creatorProfile: { findUnique: jest.fn() },
    socialConnection: { findUnique: jest.fn() },
    instagramMediaItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    instagramMediaSyncState: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const baseConfig: Record<string, unknown> = {
    IG_MEDIA_CACHE_TTL_DAYS: 7,
    IG_MEDIA_MAX_PAGES: 2,
    IG_MEDIA_REFRESH_MIN_INTERVAL_MIN: 60,
  };
  let configValues: Record<string, unknown> = { ...baseConfig };
  const configMock = {
    get: jest.fn(
      (key: string, fallback?: unknown) => configValues[key] ?? fallback,
    ),
  };
  const instagramMock = { fetchMediaPage: jest.fn() };
  const connectionsMock = {
    getFreshAccessToken: jest.fn().mockResolvedValue('token'),
    markConnectionError: jest.fn(),
  };

  let service: InstagramMediaService;

  beforeEach(() => {
    // resetAllMocks, not clearAllMocks: clear leaves queued mockResolvedValueOnce
    // values and implementations in place, so a test that queues two pages and
    // consumes one hands the leftover to whichever test runs next. Every
    // implementation the suite relies on is (re-)established below.
    jest.resetAllMocks();
    configValues = { ...baseConfig };
    configMock.get.mockImplementation(
      (key: string, fallback?: unknown) => configValues[key] ?? fallback,
    );
    connectionsMock.getFreshAccessToken.mockResolvedValue('token');
    prismaMock.creatorProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    prismaMock.socialConnection.findUnique.mockResolvedValue({
      id: connectionId,
      username: 'creator.handle',
      status: 'ACTIVE',
    });
    prismaMock.instagramMediaItem.count.mockResolvedValue(0);
    service = new InstagramMediaService(
      prismaMock as never,
      configMock as never,
      instagramMock as never,
      connectionsMock as never,
    );
  });

  function page(items: unknown[], nextCursor: string | null) {
    return { items, nextCursor, usage: null };
  }

  const reel = (id: string) => ({
    id,
    mediaType: 'VIDEO',
    mediaProductType: 'REELS',
    mediaUrl: `https://scontent.cdninstagram.com/${id}.mp4`,
    thumbnailUrl: null,
    permalink: null,
    caption: null,
    postedAt: new Date('2026-07-01T00:00:00Z'),
    likeCount: null,
    commentsCount: null,
  });
  const photo = (id: string) => ({ ...reel(id), mediaType: 'IMAGE' });

  describe('syncConnectionMedia', () => {
    it('stores reels and discards photos', async () => {
      instagramMock.fetchMediaPage.mockResolvedValueOnce(
        page([reel('1'), photo('2'), reel('3')], null),
      );

      const result = await service.syncConnectionMedia(connectionId);

      expect(result.reels).toBe(2);
      expect(prismaMock.instagramMediaItem.upsert).toHaveBeenCalledTimes(2);
      const ids = prismaMock.instagramMediaItem.upsert.mock.calls.map(
        (c) => c[0].where.connectionId_igMediaId.igMediaId,
      );
      expect(ids).toEqual(['1', '3']);
    });

    it('never clears importedVideoId on a re-sync', async () => {
      instagramMock.fetchMediaPage.mockResolvedValueOnce(
        page([reel('1')], null),
      );
      await service.syncConnectionMedia(connectionId);
      const { update } = prismaMock.instagramMediaItem.upsert.mock.calls[0]![0];
      expect(update).not.toHaveProperty('importedVideoId');
    });

    it('stops at the page budget and keeps the cursor for later', async () => {
      instagramMock.fetchMediaPage
        .mockResolvedValueOnce(page([reel('1')], 'cur-1'))
        .mockResolvedValueOnce(page([reel('2')], 'cur-2'));

      const result = await service.syncConnectionMedia(connectionId);

      expect(result.pages).toBe(2); // IG_MEDIA_MAX_PAGES
      expect(instagramMock.fetchMediaPage).toHaveBeenCalledTimes(2);
      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.hasMore).toBe(true);
      expect(final.data.nextCursor).toBe('cur-2');
    });

    it('stops at the reel budget even when Instagram has more pages', async () => {
      configValues.IG_MEDIA_SYNC_BATCH_REELS = 2;
      configValues.IG_MEDIA_MAX_PAGES = 12;
      instagramMock.fetchMediaPage
        .mockResolvedValueOnce(page([reel('1'), reel('2')], 'cur-1'))
        .mockResolvedValueOnce(page([reel('3')], 'cur-2'));

      const result = await service.syncConnectionMedia(connectionId);

      // The budget binds first: one page was enough, so the second was never
      // requested even though eleven pages of headroom remained.
      expect(result.pages).toBe(1);
      expect(instagramMock.fetchMediaPage).toHaveBeenCalledTimes(1);
      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.hasMore).toBe(true);
      expect(final.data.nextCursor).toBe('cur-1');
    });

    it('keeps paging past a photo-only page to reach its reel budget', async () => {
      configValues.IG_MEDIA_SYNC_BATCH_REELS = 1;
      instagramMock.fetchMediaPage
        .mockResolvedValueOnce(page([photo('1'), photo('2')], 'cur-1'))
        .mockResolvedValueOnce(page([reel('3')], 'cur-2'));

      const result = await service.syncConnectionMedia(connectionId);

      // Photos do not count towards the budget, so the walk continued.
      expect(result.pages).toBe(2);
      expect(result.reels).toBe(1);
    });

    it('stamps lastSyncedAt on a budget-capped batch, not just a full walk', async () => {
      // The bug this fixes: stamping only on a completed walk left any account
      // bigger than one batch permanently "stale", so the gallery reported
      // syncing on every open and re-enqueued a Graph walk each time.
      instagramMock.fetchMediaPage
        .mockResolvedValueOnce(page([reel('1')], 'cur-1'))
        .mockResolvedValueOnce(page([reel('2')], 'cur-2'));

      await service.syncConnectionMedia(connectionId);

      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.hasMore).toBe(true);
      expect(final.data.lastSyncedAt).toBeInstanceOf(Date);
    });

    it('stamps lastSyncedAt when the walk finishes the account too', async () => {
      instagramMock.fetchMediaPage.mockResolvedValueOnce(
        page([reel('1')], null),
      );
      await service.syncConnectionMedia(connectionId);
      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.hasMore).toBe(false);
      expect(final.data.lastSyncedAt).toBeInstanceOf(Date);
    });

    it('resumes from the stored cursor when extending', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'saved',
        hasMore: true,
        lastSyncedAt: new Date(),
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(page([], null));

      await service.syncConnectionMedia(connectionId, { mode: 'extend' });

      expect(instagramMock.fetchMediaPage).toHaveBeenCalledWith(
        'token',
        'saved',
        25,
      );
    });

    it('ignores the stored cursor on a refresh', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'saved',
        hasMore: true,
        lastSyncedAt: new Date(),
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(page([], null));

      await service.syncConnectionMedia(connectionId, { mode: 'refresh' });

      expect(instagramMock.fetchMediaPage).toHaveBeenCalledWith(
        'token',
        null,
        25,
      );
    });

    it('leaves the paging frontier alone on a refresh', async () => {
      // A creator who had paged out to reel 500 must not have the cursor reset
      // to reel 100 by a freshness pass, or Load more would spend four clicks
      // re-fetching reels they already have before it advanced again.
      configValues.IG_MEDIA_SYNC_BATCH_REELS = 1;
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'deep-frontier',
        hasMore: true,
        lastSyncedAt: new Date(),
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(
        page([reel('1')], 'top-of-account'),
      );

      await service.syncConnectionMedia(connectionId, { mode: 'refresh' });

      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data).not.toHaveProperty('nextCursor');
      expect(final.data).not.toHaveProperty('hasMore');
      expect(final.data.lastSyncedAt).toBeInstanceOf(Date);
    });

    it('moves the frontier on an extend', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'page-4',
        hasMore: true,
        lastSyncedAt: new Date(),
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(
        page([reel('101')], 'page-5'),
      );
      configValues.IG_MEDIA_SYNC_BATCH_REELS = 1;

      await service.syncConnectionMedia(connectionId, { mode: 'extend' });

      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.nextCursor).toBe('page-5');
      expect(final.data.hasMore).toBe(true);
    });

    it('spends no Graph call extending an account that is fully cached', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: null,
        hasMore: false,
        lastSyncedAt: new Date(),
      });

      const result = await service.syncConnectionMedia(connectionId, {
        mode: 'extend',
      });

      expect(result).toEqual({ reels: 0, pages: 0, usage: null });
      expect(instagramMock.fetchMediaPage).not.toHaveBeenCalled();
      // Not even marked SYNCING: a no-op must not leave the gallery spinning.
      expect(prismaMock.instagramMediaSyncState.upsert).not.toHaveBeenCalled();
    });

    it('extends on a first sync, so the very first batch sets the frontier', async () => {
      // `auto` with nothing synced yet has to be an extend: a refresh would
      // leave nextCursor null and Load more would restart from the top forever.
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue(null);
      instagramMock.fetchMediaPage
        .mockResolvedValueOnce(page([reel('1')], 'cur-1'))
        .mockResolvedValueOnce(page([reel('2')], 'cur-2'));

      await service.syncConnectionMedia(connectionId, { mode: 'auto' });

      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.nextCursor).toBe('cur-2');
    });

    it('refreshes rather than extends once a batch has already synced', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'saved',
        hasMore: true,
        lastSyncedAt: new Date('2026-08-01T00:00:00Z'),
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(page([], null));

      await service.syncConnectionMedia(connectionId, { mode: 'auto' });

      expect(instagramMock.fetchMediaPage).toHaveBeenCalledWith(
        'token',
        null,
        25,
      );
    });

    it('records the failure on the sync state and rethrows', async () => {
      instagramMock.fetchMediaPage.mockRejectedValue(new Error('Graph down'));

      await expect(service.syncConnectionMedia(connectionId)).rejects.toThrow(
        'Graph down',
      );
      const failed =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(failed.data.status).toBe(IgMediaSyncStatus.ERROR);
      expect(failed.data.lastError).toBe('Graph down');
    });
  });

  describe('gallery importability', () => {
    const row = (over: Record<string, unknown> = {}) => ({
      igMediaId: '1',
      permalink: null,
      thumbnailUrl: 'https://scontent.cdninstagram.com/1.jpg',
      caption: null,
      postedAt: new Date('2026-07-01T00:00:00Z'),
      durationSeconds: null,
      likeCount: null,
      viewCount: null,
      importedVideoId: null,
      mediaUrl: 'https://scontent.cdninstagram.com/1.mp4',
      ...over,
    });

    beforeEach(() => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        hasMore: false,
        reelCount: 2,
        lastError: null,
      });
    });

    it('marks a reel with a media url importable', async () => {
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([row()]);
      prismaMock.instagramMediaItem.count.mockResolvedValue(0);

      const result = await service.getGalleryPage(userId);

      expect(result.items[0]!.importable).toBe(true);
    });

    it('marks a reel Instagram withheld the file for as not importable', async () => {
      // The thumbnail still comes back, which is why these look normal in the
      // picker and have to be flagged explicitly.
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([
        row({ mediaUrl: null }),
      ]);
      prismaMock.instagramMediaItem.count.mockResolvedValue(1);

      const result = await service.getGalleryPage(userId);

      expect(result.items[0]!.importable).toBe(false);
      expect(result.items[0]!.thumbnailUrl).not.toBeNull();
    });

    it('counts the unavailable reels across the whole cache on the first page', async () => {
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([row()]);
      prismaMock.instagramMediaItem.count.mockResolvedValue(7);

      const result = await service.getGalleryPage(userId);

      expect(result.unavailableCount).toBe(7);
      expect(prismaMock.instagramMediaItem.count).toHaveBeenCalledWith({
        where: {
          connectionId,
          mediaProductType: 'REELS',
          mediaUrl: null,
        },
      });
    });

    it('does not recount on a later page', async () => {
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([row()]);

      const result = await service.getGalleryPage(userId, {
        cursor: encodeGalleryCursor({
          postedAt: new Date('2026-07-02T00:00:00Z'),
          igMediaId: '9',
        }),
      });

      expect(result.unavailableCount).toBeNull();
      expect(prismaMock.instagramMediaItem.count).not.toHaveBeenCalled();
    });
  });

  describe('hasMoreToFetch', () => {
    it('is true while Instagram has reels past the cache', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        hasMore: true,
      });
      await expect(service.hasMoreToFetch(connectionId)).resolves.toBe(true);
    });

    it('is false once the whole account is cached', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        hasMore: false,
      });
      await expect(service.hasMoreToFetch(connectionId)).resolves.toBe(false);
    });

    it('is true for a connection that has never synced', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue(null);
      await expect(service.hasMoreToFetch(connectionId)).resolves.toBe(true);
    });
  });

  describe('assertRefreshAllowed', () => {
    it('allows a first refresh', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue(null);
      await expect(
        service.assertRefreshAllowed(connectionId),
      ).resolves.toBeUndefined();
    });

    it('reports the remaining wait instead of silently ignoring', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        lastRefreshAt: new Date(Date.now() - 17 * 60_000),
      });
      await expect(service.assertRefreshAllowed(connectionId)).rejects.toThrow(
        /try again in 43 minutes/,
      );
    });

    it('allows one again after the interval', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        lastRefreshAt: new Date(Date.now() - 61 * 60_000),
      });
      await expect(
        service.assertRefreshAllowed(connectionId),
      ).resolves.toBeUndefined();
    });
  });

  describe('getGalleryPage', () => {
    it('reports not_connected without touching the cache', async () => {
      prismaMock.socialConnection.findUnique.mockResolvedValue(null);
      const result = await service.getGalleryPage(userId);
      expect(result.status).toBe('not_connected');
      expect(prismaMock.instagramMediaItem.findMany).not.toHaveBeenCalled();
    });

    it('asks for a reconnect when the token was revoked', async () => {
      prismaMock.socialConnection.findUnique.mockResolvedValue({
        id: connectionId,
        username: 'creator.handle',
        status: 'ERROR',
      });
      const result = await service.getGalleryPage(userId);
      expect(result.status).toBe('reconnect_required');
    });

    it('serves a fresh cache as ready, with no cursor on the last page', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        reelCount: 1,
        lastError: null,
      });
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([
        {
          igMediaId: '1',
          permalink: null,
          thumbnailUrl: null,
          caption: null,
          postedAt: new Date(),
          durationSeconds: null,
          likeCount: null,
          viewCount: null,
          importedVideoId: null,
        },
      ]);

      const result = await service.getGalleryPage(userId, { limit: 24 });

      expect(result.status).toBe('ready');
      expect(result.stale).toBe(false);
      expect(result.nextCursor).toBeNull();
      expect(result.items[0]!.alreadyImported).toBe(false);
    });

    it('reports ready for a fresh sync that found zero reels, instead of resyncing forever', async () => {
      // A completed, still-fresh walk that legitimately found nothing must not
      // report 'syncing' — that previously made the controller re-enqueue a
      // sync on every single page load, in a loop that never settled.
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        reelCount: 0,
        lastError: null,
      });
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);

      const result = await service.getGalleryPage(userId);

      expect(result.status).toBe('ready');
      expect(result.stale).toBe(false);
      expect(result.items).toHaveLength(0);
    });

    it('serves a populated cache with more on Instagram as ready, not syncing', async () => {
      // The gallery must not report 'syncing' just because the account is
      // bigger than one batch — that is what made every open re-enqueue a
      // Graph walk. `hasMoreOnInstagram` is how the tail is offered instead.
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        hasMore: true,
        reelCount: 100,
        lastError: null,
      });
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([
        {
          igMediaId: '1',
          permalink: null,
          thumbnailUrl: null,
          caption: null,
          postedAt: new Date(),
          durationSeconds: null,
          likeCount: null,
          viewCount: null,
          importedVideoId: null,
        },
      ]);

      const result = await service.getGalleryPage(userId);

      expect(result.status).toBe('ready');
      expect(result.hasMoreOnInstagram).toBe(true);
      expect(result.reelCount).toBe(100);
    });

    it('reports no more on Instagram once the account is fully cached', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        hasMore: false,
        reelCount: 4,
        lastError: null,
      });
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);

      const result = await service.getGalleryPage(userId);

      expect(result.hasMoreOnInstagram).toBe(false);
    });

    it('assumes more exists for a cache that has never synced', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue(null);
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);

      const result = await service.getGalleryPage(userId);

      // Better to offer a fetch that finds nothing than to tell the creator
      // their account is empty before we have looked.
      expect(result.hasMoreOnInstagram).toBe(true);
      expect(result.status).toBe('syncing');
    });

    it('returns a stale cache immediately, flagged for a background refresh', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        reelCount: 1,
        lastError: null,
      });
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([
        {
          igMediaId: '1',
          permalink: null,
          thumbnailUrl: null,
          caption: null,
          postedAt: new Date(),
          durationSeconds: null,
          likeCount: null,
          viewCount: null,
          importedVideoId: 'video-9',
        },
      ]);

      const result = await service.getGalleryPage(userId);

      expect(result.stale).toBe(true);
      expect(result.status).toBe('syncing');
      expect(result.items).toHaveLength(1);
      expect(result.items[0]!.alreadyImported).toBe(true);
    });

    it('emits a cursor when another page exists', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        reelCount: 3,
        lastError: null,
      });
      const row = (id: string) => ({
        igMediaId: id,
        permalink: null,
        thumbnailUrl: null,
        caption: null,
        postedAt: new Date('2026-07-01T00:00:00Z'),
        durationSeconds: null,
        likeCount: null,
        viewCount: null,
        importedVideoId: null,
      });
      // limit+1 rows back means "there is more".
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([
        row('3'),
        row('2'),
        row('1'),
      ]);

      const result = await service.getGalleryPage(userId, { limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).not.toBeNull();
      expect(decodeGalleryCursor(result.nextCursor!).igMediaId).toBe('2');
    });

    it('resolves an admin read by creator profile, not by signed-in user', async () => {
      // The admin path must never fall back to the caller's own profile — that
      // is how an admin would silently be shown their own (absent) reels.
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue(null);
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);

      await service.getGalleryPageForCreator('profile-42');

      expect(prismaMock.creatorProfile.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.socialConnection.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            creatorProfileId_platform: {
              creatorProfileId: 'profile-42',
              platform: 'INSTAGRAM',
            },
          },
        }),
      );
    });

    it('reports not_connected for a creator with no Instagram link', async () => {
      prismaMock.socialConnection.findUnique.mockResolvedValue(null);
      const result = await service.getGalleryPageForCreator('profile-42');
      expect(result.status).toBe('not_connected');
      expect(result.items).toEqual([]);
    });

    it('serves the creator own cache on the admin path', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastSyncedAt: new Date(),
        reelCount: 1,
        lastError: null,
      });
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([
        {
          igMediaId: 'r1',
          permalink: null,
          thumbnailUrl: null,
          caption: null,
          postedAt: new Date(),
          durationSeconds: null,
          likeCount: null,
          viewCount: null,
          importedVideoId: null,
        },
      ]);

      const result = await service.getGalleryPageForCreator('profile-42');

      expect(result.status).toBe('ready');
      expect(result.items).toHaveLength(1);
      expect(prismaMock.instagramMediaItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ connectionId }),
        }),
      );
    });

    it('only queries reels', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue(null);
      prismaMock.instagramMediaItem.findMany.mockResolvedValue([]);
      await service.getGalleryPage(userId);
      expect(prismaMock.instagramMediaItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ mediaProductType: 'REELS' }),
        }),
      );
    });
  });
});
