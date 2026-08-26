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
  const configMock = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const values: Record<string, unknown> = {
        IG_MEDIA_CACHE_TTL_DAYS: 7,
        IG_MEDIA_MAX_PAGES: 2,
        IG_MEDIA_REFRESH_MIN_INTERVAL_MIN: 60,
      };
      return values[key] ?? fallback;
    }),
  };
  const instagramMock = { fetchMediaPage: jest.fn() };
  const connectionsMock = {
    getFreshAccessToken: jest.fn().mockResolvedValue('token'),
    markConnectionError: jest.fn(),
  };

  let service: InstagramMediaService;

  beforeEach(() => {
    jest.clearAllMocks();
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
      // A budget-capped walk is not a full sync, so the TTL clock is untouched.
      expect(final.data).not.toHaveProperty('lastFullSyncAt');
    });

    it('stamps lastFullSyncAt only when the walk actually finishes', async () => {
      instagramMock.fetchMediaPage.mockResolvedValueOnce(
        page([reel('1')], null),
      );
      await service.syncConnectionMedia(connectionId);
      const final =
        prismaMock.instagramMediaSyncState.update.mock.calls.at(-1)![0];
      expect(final.data.hasMore).toBe(false);
      expect(final.data.lastFullSyncAt).toBeInstanceOf(Date);
    });

    it('resumes from the stored cursor unless told to start over', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'saved',
        hasMore: true,
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(page([], null));

      await service.syncConnectionMedia(connectionId);

      expect(instagramMock.fetchMediaPage).toHaveBeenCalledWith(
        'token',
        'saved',
        25,
      );
    });

    it('ignores the stored cursor on a forced refresh', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        nextCursor: 'saved',
        hasMore: true,
      });
      instagramMock.fetchMediaPage.mockResolvedValueOnce(page([], null));

      await service.syncConnectionMedia(connectionId, { fromStart: true });

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
        lastFullSyncAt: new Date(),
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

    it('returns a stale cache immediately, flagged for a background refresh', async () => {
      prismaMock.instagramMediaSyncState.findUnique.mockResolvedValue({
        status: IgMediaSyncStatus.READY,
        lastFullSyncAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
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
        lastFullSyncAt: new Date(),
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
