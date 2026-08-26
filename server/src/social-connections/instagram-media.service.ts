import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IgMediaSyncStatus,
  SocialConnectionStatus,
  SocialPlatform,
  type InstagramMediaItem,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  InstagramApiError,
  InstagramClient,
  peakUsagePct,
  type InstagramMediaNode,
  type InstagramUsage,
} from './instagram.client';
import { SocialConnectionsService } from './social-connections.service';

/** Instagram's own label for a reel, as returned in `media_product_type`. */
const REELS_PRODUCT_TYPE = 'REELS';
const VIDEO_MEDIA_TYPE = 'VIDEO';
/** Graph's maximum page size for /me/media. */
const PAGE_SIZE = 25;
/**
 * How long a signed CDN URL is assumed to last. Meta does not publish a figure
 * and does not return an expiry, so this is deliberately pessimistic: the cost
 * of being early is one extra re-sync, the cost of being late is a dead player.
 */
const URL_TTL_HOURS = 12;

export interface GalleryItem {
  igMediaId: string;
  permalink: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  postedAt: Date | null;
  durationSeconds: number | null;
  likeCount: number | null;
  viewCount: number | null;
  alreadyImported: boolean;
  portfolioVideoId: string | null;
}

export interface SyncStatus {
  status: string;
  reelCount: number;
  lastFullSyncAt: Date | null;
  hasMore: boolean;
  error: string | null;
}

export interface GalleryPage {
  status:
    | 'ready'
    | 'syncing'
    | 'error'
    | 'not_connected'
    | 'reconnect_required';
  username: string | null;
  lastFullSyncAt: Date | null;
  /** True once the cache is older than the TTL. */
  stale: boolean;
  items: GalleryItem[];
  /** OUR keyset cursor over the cache — not Graph's. */
  nextCursor: string | null;
  reelCount: number;
  error: string | null;
}

/** Is this media item a reel, as opposed to a photo, carousel or feed video? */
export function isReel(node: {
  mediaType: string;
  mediaProductType: string | null;
}): boolean {
  return (
    node.mediaType === VIDEO_MEDIA_TYPE &&
    node.mediaProductType === REELS_PRODUCT_TYPE
  );
}

/**
 * Encode/decode the gallery cursor. It is a keyset over (postedAt, igMediaId)
 * rather than an offset, so inserting a newer reel mid-scroll cannot make the
 * reader skip or repeat an item.
 */
export function encodeGalleryCursor(item: {
  postedAt: Date | null;
  igMediaId: string;
}): string {
  const payload = JSON.stringify({
    p: item.postedAt ? item.postedAt.toISOString() : null,
    i: item.igMediaId,
  });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeGalleryCursor(cursor: string): {
  postedAt: Date | null;
  igMediaId: string;
} {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw) as { p?: string | null; i?: string };
    if (!parsed.i) throw new Error('missing id');
    return {
      postedAt: parsed.p ? new Date(parsed.p) : null,
      igMediaId: parsed.i,
    };
  } catch {
    throw new BadRequestException('Invalid cursor');
  }
}

/**
 * Owns the reel cache: walking `/me/media`, storing reels, and serving the
 * gallery out of Postgres.
 *
 * Nothing here is called from a request that needs Graph — reads come from the
 * cache and a miss only enqueues. The queue service handles concurrency and
 * rate limiting so this class stays about data.
 */
@Injectable()
export class InstagramMediaService {
  private readonly logger = new Logger(InstagramMediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly instagram: InstagramClient,
    private readonly connections: SocialConnectionsService,
  ) {}

  cacheTtlMs(): number {
    const days = Number(this.config.get('IG_MEDIA_CACHE_TTL_DAYS', 7));
    return days * 24 * 60 * 60 * 1000;
  }

  private maxPages(): number {
    return Math.max(1, Number(this.config.get('IG_MEDIA_MAX_PAGES', 12)));
  }

  private refreshMinIntervalMs(): number {
    const min = Number(
      this.config.get('IG_MEDIA_REFRESH_MIN_INTERVAL_MIN', 60),
    );
    return Math.max(0, min) * 60_000;
  }

  /** The creator's active Instagram connection, or null. */
  async findConnectionForUser(userId: string) {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return null;
    return this.prisma.socialConnection.findUnique({
      where: {
        creatorProfileId_platform: {
          creatorProfileId: profile.id,
          platform: SocialPlatform.INSTAGRAM,
        },
      },
    });
  }

  /**
   * A specific creator's Instagram connection, for admin-scoped reads. Route
   * guards do the authorization; this only resolves.
   */
  async findConnectionForCreatorProfile(creatorProfileId: string) {
    return this.prisma.socialConnection.findUnique({
      where: {
        creatorProfileId_platform: {
          creatorProfileId,
          platform: SocialPlatform.INSTAGRAM,
        },
      },
    });
  }

  /** Gallery for the signed-in creator's own account. */
  async getGalleryPage(
    userId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<GalleryPage> {
    return this.buildGalleryPage(
      await this.findConnectionForUser(userId),
      opts,
    );
  }

  /**
   * Gallery for a named creator, so an admin can browse and import on their
   * behalf. Reads the creator's own cache and uses the creator's own token, so
   * the admin never needs an Instagram account of their own.
   */
  async getGalleryPageForCreator(
    creatorProfileId: string,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<GalleryPage> {
    return this.buildGalleryPage(
      await this.findConnectionForCreatorProfile(creatorProfileId),
      opts,
    );
  }

  /**
   * Serve one page of the gallery from the cache. Never calls Graph: a cold or
   * stale cache reports its state so the caller can enqueue a sync and the UI
   * can show what it has meanwhile.
   */
  private async buildGalleryPage(
    connection: {
      id: string;
      username: string | null;
      status: SocialConnectionStatus;
    } | null,
    opts: { cursor?: string; limit?: number } = {},
  ): Promise<GalleryPage> {
    if (!connection) {
      return this.emptyPage('not_connected');
    }
    if (connection.status === SocialConnectionStatus.ERROR) {
      return {
        ...this.emptyPage('reconnect_required'),
        username: connection.username,
      };
    }

    const limit = Math.min(Math.max(opts.limit ?? 24, 1), 50);
    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId: connection.id },
    });

    const where = {
      connectionId: connection.id,
      mediaProductType: REELS_PRODUCT_TYPE,
      ...(opts.cursor ? this.keysetWhere(opts.cursor) : {}),
    };

    // One extra row tells us whether another page exists without a count query.
    const rows = await this.prisma.instagramMediaItem.findMany({
      where,
      orderBy: [{ postedAt: 'desc' }, { igMediaId: 'desc' }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const lastFullSyncAt = state?.lastFullSyncAt ?? null;
    const stale =
      !lastFullSyncAt ||
      Date.now() - lastFullSyncAt.getTime() > this.cacheTtlMs();

    return {
      status: this.galleryStatus(state, page.length, stale),
      username: connection.username,
      lastFullSyncAt,
      stale,
      items: page.map((r) => this.toGalleryItem(r)),
      nextCursor:
        hasMore && page.length > 0
          ? encodeGalleryCursor(page[page.length - 1]!)
          : null,
      reelCount: state?.reelCount ?? page.length,
      error: state?.lastError ?? null,
    };
  }

  /**
   * `(postedAt, igMediaId) < (cursor.postedAt, cursor.igMediaId)` in descending
   * order. Rows with a null postedAt sort last, so once the cursor is on one we
   * only continue among nulls.
   */
  private keysetWhere(cursor: string) {
    const { postedAt, igMediaId } = decodeGalleryCursor(cursor);
    if (!postedAt) {
      return { postedAt: null, igMediaId: { lt: igMediaId } };
    }
    return {
      OR: [
        { postedAt: { lt: postedAt } },
        { postedAt: null },
        { postedAt, igMediaId: { lt: igMediaId } },
      ],
    };
  }

  private galleryStatus(
    state: { status: IgMediaSyncStatus; lastError: string | null } | null,
    itemCount: number,
    stale: boolean,
  ): GalleryPage['status'] {
    if (state?.status === IgMediaSyncStatus.ERROR) return 'error';
    if (
      state?.status === IgMediaSyncStatus.QUEUED ||
      state?.status === IgMediaSyncStatus.SYNCING
    ) {
      return 'syncing';
    }
    // Nothing cached yet, or too old to trust — the caller will enqueue.
    if (itemCount === 0 || stale) return 'syncing';
    return 'ready';
  }

  private emptyPage(status: GalleryPage['status']): GalleryPage {
    return {
      status,
      username: null,
      lastFullSyncAt: null,
      stale: true,
      items: [],
      nextCursor: null,
      reelCount: 0,
      error: null,
    };
  }

  private toGalleryItem(row: InstagramMediaItem): GalleryItem {
    return {
      igMediaId: row.igMediaId,
      permalink: row.permalink,
      thumbnailUrl: row.thumbnailUrl,
      caption: row.caption,
      postedAt: row.postedAt,
      durationSeconds: row.durationSeconds,
      likeCount: row.likeCount,
      viewCount: row.viewCount,
      alreadyImported: row.importedVideoId != null,
      portfolioVideoId: row.importedVideoId,
    };
  }

  /** Sync progress for the polling endpoint (own account). */
  async getSyncStatus(userId: string): Promise<SyncStatus> {
    return this.buildSyncStatus(await this.findConnectionForUser(userId));
  }

  /** Sync progress for a named creator, for the admin gallery. */
  async getSyncStatusForCreator(creatorProfileId: string): Promise<SyncStatus> {
    return this.buildSyncStatus(
      await this.findConnectionForCreatorProfile(creatorProfileId),
    );
  }

  private async buildSyncStatus(
    connection: { id: string } | null,
  ): Promise<SyncStatus> {
    if (!connection) {
      return {
        status: 'not_connected',
        reelCount: 0,
        lastFullSyncAt: null,
        hasMore: false,
        error: null,
      };
    }
    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId: connection.id },
    });
    return {
      status: (state?.status ?? IgMediaSyncStatus.IDLE).toLowerCase(),
      reelCount: state?.reelCount ?? 0,
      lastFullSyncAt: state?.lastFullSyncAt ?? null,
      hasMore: state?.hasMore ?? true,
      error: state?.lastError ?? null,
    };
  }

  /** True when the cache is missing or older than the TTL. */
  async needsSync(connectionId: string): Promise<boolean> {
    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId },
      select: { lastFullSyncAt: true },
    });
    if (!state?.lastFullSyncAt) return true;
    return Date.now() - state.lastFullSyncAt.getTime() > this.cacheTtlMs();
  }

  /**
   * Guard for the manual Refresh button. Throws with the remaining wait rather
   * than silently ignoring the request, so the UI can say how long is left.
   */
  async assertRefreshAllowed(connectionId: string): Promise<void> {
    const interval = this.refreshMinIntervalMs();
    if (interval === 0) return;
    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId },
      select: { lastRefreshAt: true },
    });
    const last = state?.lastRefreshAt;
    if (!last) return;
    const elapsed = Date.now() - last.getTime();
    if (elapsed < interval) {
      const minutes = Math.ceil((interval - elapsed) / 60_000);
      throw new BadRequestException(
        `Just refreshed a moment ago — try again in ${minutes} minute${
          minutes === 1 ? '' : 's'
        }.`,
      );
    }
  }

  async markRefreshRequested(connectionId: string): Promise<void> {
    await this.prisma.instagramMediaSyncState.upsert({
      where: { connectionId },
      create: {
        connectionId,
        lastRefreshAt: new Date(),
        status: IgMediaSyncStatus.QUEUED,
      },
      update: { lastRefreshAt: new Date(), status: IgMediaSyncStatus.QUEUED },
    });
  }

  async markQueued(connectionId: string): Promise<void> {
    await this.prisma.instagramMediaSyncState.upsert({
      where: { connectionId },
      create: { connectionId, status: IgMediaSyncStatus.QUEUED },
      update: { status: IgMediaSyncStatus.QUEUED },
    });
  }

  /**
   * Walk `/me/media` and cache every reel found.
   *
   * `fromStart` restarts the walk (the Refresh button); otherwise it resumes
   * from the stored Graph cursor, so scrolling past the cached tail continues
   * rather than re-fetching from the top.
   *
   * Returns the usage telemetry of the last response so the queue can throttle.
   */
  async syncConnectionMedia(
    connectionId: string,
    opts: { fromStart?: boolean } = {},
  ): Promise<{ reels: number; pages: number; usage: InstagramUsage | null }> {
    const connection = await this.prisma.socialConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    await this.prisma.instagramMediaSyncState.upsert({
      where: { connectionId },
      create: { connectionId, status: IgMediaSyncStatus.SYNCING },
      update: { status: IgMediaSyncStatus.SYNCING, lastError: null },
    });

    const startedAt = Date.now();
    let cursor: string | null = null;
    if (!opts.fromStart) {
      const state = await this.prisma.instagramMediaSyncState.findUnique({
        where: { connectionId },
        select: { nextCursor: true, hasMore: true },
      });
      cursor = state?.hasMore ? state.nextCursor : null;
    }

    let pages = 0;
    let reels = 0;
    let usage: InstagramUsage | null = null;
    let hasMore = true;

    try {
      const token = await this.connections.getFreshAccessToken(connection);

      while (pages < this.maxPages()) {
        let pageResult;
        try {
          pageResult = await this.instagram.fetchMediaPage(
            token,
            cursor,
            PAGE_SIZE,
          );
        } catch (err) {
          // A cursor can go stale between syncs. Restart from the top once
          // rather than failing — the upsert makes a restart idempotent.
          if (cursor && err instanceof InstagramApiError && !err.isAuthError) {
            this.logger.warn(
              `ig-media: cursor rejected for ${connectionId}, restarting walk — ${err.message}`,
            );
            cursor = null;
            pageResult = await this.instagram.fetchMediaPage(
              token,
              null,
              PAGE_SIZE,
            );
          } else {
            throw err;
          }
        }

        pages++;
        usage = pageResult.usage ?? usage;
        reels += await this.upsertReels(connectionId, pageResult.items);

        cursor = pageResult.nextCursor;
        if (!cursor) {
          hasMore = false;
          break;
        }
      }

      const reelCount = await this.prisma.instagramMediaItem.count({
        where: { connectionId, mediaProductType: REELS_PRODUCT_TYPE },
      });

      await this.prisma.instagramMediaSyncState.update({
        where: { connectionId },
        data: {
          status: IgMediaSyncStatus.READY,
          nextCursor: cursor,
          hasMore,
          pagesFetched: pages,
          reelCount,
          // Only a completed walk resets the freshness clock. A budget-capped
          // partial walk leaves the cache "stale" so the tail keeps loading.
          ...(hasMore ? {} : { lastFullSyncAt: new Date() }),
          lastError: null,
        },
      });

      this.logger.log(
        `ig-media: synced ${connectionId} — ${reels} new/updated reel(s), ${reelCount} cached, ${pages} page(s), ${Date.now() - startedAt}ms`,
      );
      return { reels, pages, usage };
    } catch (err) {
      const message = (err as Error)?.message ?? 'unknown error';
      await this.prisma.instagramMediaSyncState.update({
        where: { connectionId },
        data: { status: IgMediaSyncStatus.ERROR, lastError: message },
      });
      if (err instanceof InstagramApiError && err.isAuthError) {
        await this.connections.markConnectionError(connectionId, message);
      }
      throw err;
    }
  }

  /**
   * Store the reels from one page. Photos and carousels are dropped here and
   * never written, so the cache only ever holds what the gallery shows.
   */
  private async upsertReels(
    connectionId: string,
    nodes: InstagramMediaNode[],
  ): Promise<number> {
    const reels = nodes.filter((n) => isReel(n));
    if (reels.length === 0) return 0;

    const urlsExpireAt = new Date(Date.now() + URL_TTL_HOURS * 60 * 60 * 1000);

    for (const node of reels) {
      const data = {
        mediaType: node.mediaType,
        mediaProductType: node.mediaProductType,
        permalink: node.permalink,
        caption: node.caption,
        mediaUrl: node.mediaUrl,
        thumbnailUrl: node.thumbnailUrl,
        urlsExpireAt,
        postedAt: node.postedAt,
        likeCount: node.likeCount,
        commentsCount: node.commentsCount,
        fetchedAt: new Date(),
      };
      await this.prisma.instagramMediaItem.upsert({
        where: {
          connectionId_igMediaId: { connectionId, igMediaId: node.id },
        },
        create: { connectionId, igMediaId: node.id, ...data },
        // Deliberately does not touch importedVideoId: a re-sync must not
        // forget that a reel is already in the portfolio.
        update: data,
      });
    }
    return reels.length;
  }

  /**
   * Re-read one page from the top to refresh the signed URLs on recent reels.
   * Used before a mirror when the cached URL has aged past `urlsExpireAt`.
   */
  async refreshFirstPage(connectionId: string): Promise<void> {
    const connection = await this.prisma.socialConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) return;
    const token = await this.connections.getFreshAccessToken(connection);
    const page = await this.instagram.fetchMediaPage(token, null, PAGE_SIZE);
    await this.upsertReels(connectionId, page.items);
  }

  /** Connections whose cache is stale enough for the nightly refresh. */
  async listConnectionIdsWithStaleCache(
    olderThanDays: number,
  ): Promise<string[]> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.instagramMediaSyncState.findMany({
      where: {
        OR: [{ lastFullSyncAt: null }, { lastFullSyncAt: { lte: cutoff } }],
        connection: { status: SocialConnectionStatus.ACTIVE },
      },
      select: { connectionId: true },
    });
    return rows.map((r) => r.connectionId);
  }

  /** Exposed for the queue's adaptive throttle. */
  peakUsage(usage: InstagramUsage | null): number {
    return peakUsagePct(usage);
  }
}
