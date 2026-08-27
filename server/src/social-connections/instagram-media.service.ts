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
import { PortfolioRealtimeNotifier } from '../realtime/portfolio-realtime.notifier';

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
/**
 * Reels one sync batch fetches before stopping, even when Instagram has more.
 *
 * A creator with a thousand reels does not want a thousand-reel walk on open,
 * and we do not want to spend the Graph budget on reels nobody scrolled to. The
 * first batch is what the gallery opens on; the rest is fetched only when the
 * reader asks for it, resuming from the stored Graph cursor.
 */
const DEFAULT_SYNC_BATCH_REELS = 100;

/**
 * What a sync is for. The distinction matters because the two directions walk
 * the account from opposite ends and must not overwrite each other's progress.
 *
 * - `refresh` re-reads the newest reels. Leaves the deep-paging frontier alone.
 * - `extend`  resumes from the frontier for the next batch, and moves it.
 * - `auto`    resolves to `extend` while the frontier has never been set (so a
 *             first sync establishes it) and to `refresh` from then on.
 */
export type IgSyncMode = 'auto' | 'refresh' | 'extend';

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
  /**
   * False when Instagram gave us no downloadable file for this reel, so there is
   * nothing to import. Meta omits `media_url` for media containing copyrighted
   * material — licensed audio on a reel being the common case — while still
   * returning `thumbnail_url`, which is why such a reel looks perfectly normal
   * in the picker.
   *
   * A snapshot: a copyright flag can be applied or lifted later, so a Refresh
   * can change this.
   */
  importable: boolean;
}

export interface SyncStatus {
  status: string;
  reelCount: number;
  lastSyncedAt: Date | null;
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
  lastSyncedAt: Date | null;
  /**
   * True once the cache is older than the TTL. Informational only: a stale
   * cache is still served as-is and never triggers a sync on its own, so
   * opening the gallery costs nothing. Refresh is the deliberate action.
   */
  stale: boolean;
  items: GalleryItem[];
  /** OUR keyset cursor over the cache — not Graph's. */
  nextCursor: string | null;
  /**
   * True when Instagram has reels past the end of the cache. The reader has to
   * ask for them — reaching the cache tail is what surfaces "Load more", and
   * only that button spends a Graph call.
   */
  hasMoreOnInstagram: boolean;
  reelCount: number;
  /**
   * Cached reels Instagram will not let us download (see GalleryItem.importable),
   * across the whole cache rather than just this page. Computed for the first
   * page only — null afterwards — because it exists to size one banner, not to
   * be recounted on every scroll.
   */
  unavailableCount: number | null;
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
    private readonly realtime: PortfolioRealtimeNotifier,
  ) {}

  cacheTtlMs(): number {
    const days = Number(this.config.get('IG_MEDIA_CACHE_TTL_DAYS', 7));
    return days * 24 * 60 * 60 * 1000;
  }

  /**
   * Hard page ceiling for one batch. The reel budget normally binds first; this
   * is what stops a photo-heavy account from walking forever to find 100 reels.
   */
  private maxPages(): number {
    return Math.max(1, Number(this.config.get('IG_MEDIA_MAX_PAGES', 12)));
  }

  /** Reels one batch fetches before stopping. See DEFAULT_SYNC_BATCH_REELS. */
  private syncBatchReels(): number {
    return Math.max(
      1,
      Number(
        this.config.get('IG_MEDIA_SYNC_BATCH_REELS', DEFAULT_SYNC_BATCH_REELS),
      ),
    );
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

    // Only on the first page: the banner needs one number, and recounting it
    // for every scroll would be a query per page for a value that does not
    // change as the reader moves down the list.
    const unavailableCount = opts.cursor
      ? null
      : await this.prisma.instagramMediaItem.count({
          where: {
            connectionId: connection.id,
            mediaProductType: REELS_PRODUCT_TYPE,
            mediaUrl: null,
          },
        });

    const lastSyncedAt = state?.lastSyncedAt ?? null;
    const stale =
      !lastSyncedAt || Date.now() - lastSyncedAt.getTime() > this.cacheTtlMs();

    return {
      status: this.galleryStatus(state, stale),
      username: connection.username,
      lastSyncedAt,
      stale,
      items: page.map((r) => this.toGalleryItem(r)),
      nextCursor:
        hasMore && page.length > 0
          ? encodeGalleryCursor(page[page.length - 1]!)
          : null,
      // A cache that has never synced has not learned whether more exists, so
      // default to true rather than claiming the account ends here.
      hasMoreOnInstagram: state?.hasMore ?? true,
      reelCount: state?.reelCount ?? page.length,
      unavailableCount,
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
    stale: boolean,
  ): GalleryPage['status'] {
    if (state?.status === IgMediaSyncStatus.ERROR) return 'error';
    if (
      state?.status === IgMediaSyncStatus.QUEUED ||
      state?.status === IgMediaSyncStatus.SYNCING
    ) {
      return 'syncing';
    }
    // Never synced, or aged past the TTL — the caller will enqueue. `stale`
    // already covers "never synced" (no lastSyncedAt). Two things deliberately
    // do *not* land here: zero items (a creator can genuinely have no reels,
    // and reporting 'syncing' for that forever made the controller re-enqueue
    // on every page load) and an account with more reels than one batch holds
    // (that is `hasMoreOnInstagram`, which the reader asks for by hand).
    if (stale) return 'syncing';
    return 'ready';
  }

  private emptyPage(status: GalleryPage['status']): GalleryPage {
    return {
      status,
      username: null,
      lastSyncedAt: null,
      stale: true,
      items: [],
      nextCursor: null,
      hasMoreOnInstagram: false,
      reelCount: 0,
      unavailableCount: null,
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
      importable: row.mediaUrl != null,
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
        lastSyncedAt: null,
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
      lastSyncedAt: state?.lastSyncedAt ?? null,
      hasMore: state?.hasMore ?? true,
      error: state?.lastError ?? null,
    };
  }

  /**
   * True when Instagram has reels past the end of the cache. Backs the guard on
   * the load-more endpoint, so a reader at the true end of the account cannot
   * keep asking for a batch that does not exist.
   */
  async hasMoreToFetch(connectionId: string): Promise<boolean> {
    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId },
      select: { hasMore: true },
    });
    // Never synced: unknown, so let the first batch find out.
    return state?.hasMore ?? true;
  }

  /** True when the cache is missing or older than the TTL. */
  async needsSync(connectionId: string): Promise<boolean> {
    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId },
      select: { lastSyncedAt: true },
    });
    if (!state?.lastSyncedAt) return true;
    return Date.now() - state.lastSyncedAt.getTime() > this.cacheTtlMs();
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
   * Walk `/me/media` and cache one batch of reels.
   *
   * A batch stops at `syncBatchReels()` reels (or `maxPages()` pages, whichever
   * comes first) rather than draining the account: the gallery only needs the
   * first batch to open, and the rest is fetched when the reader asks for it.
   *
   * `mode` decides which end of the account is walked — see IgSyncMode. The
   * split exists because a freshness pass over the newest reels and a deeper
   * page into the archive would otherwise clobber each other's cursor.
   *
   * Returns the usage telemetry of the last response so the queue can throttle.
   */
  async syncConnectionMedia(
    connectionId: string,
    opts: { mode?: IgSyncMode } = {},
  ): Promise<{ reels: number; pages: number; usage: InstagramUsage | null }> {
    const connection = await this.prisma.socialConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new Error(`Connection ${connectionId} not found`);
    }

    const state = await this.prisma.instagramMediaSyncState.findUnique({
      where: { connectionId },
      select: { nextCursor: true, hasMore: true, lastSyncedAt: true },
    });

    // Resolve `auto` before anything else, so the rest of the method deals in
    // one concrete direction.
    const mode: Exclude<IgSyncMode, 'auto'> =
      opts.mode && opts.mode !== 'auto'
        ? opts.mode
        : state?.lastSyncedAt
          ? 'refresh'
          : 'extend';

    // Nothing is left past the cache, so an extend has nothing to fetch. Bail
    // before marking the state SYNCING — a no-op sync should not make the
    // gallery show a spinner it will never see resolve into new rows.
    if (mode === 'extend' && state != null && !state.hasMore) {
      this.logger.log(
        `ig-media: extend skipped for ${connectionId} — account fully cached`,
      );
      // A no-op still has to be announced: the picker put up a spinner the
      // moment the reader pressed Load more, and only an event takes it down.
      await this.realtime.emitReelSyncUpdated({
        creatorProfileId: connection.creatorProfileId,
        status: 'ready',
        hasMore: false,
      });
      return { reels: 0, pages: 0, usage: null };
    }

    await this.prisma.instagramMediaSyncState.upsert({
      where: { connectionId },
      create: { connectionId, status: IgMediaSyncStatus.SYNCING },
      update: { status: IgMediaSyncStatus.SYNCING, lastError: null },
    });

    const startedAt = Date.now();
    // A refresh always starts at the newest reel; an extend picks up where the
    // last one stopped (null on a first sync, which is the top anyway).
    let cursor: string | null =
      mode === 'extend' ? (state?.nextCursor ?? null) : null;

    let pages = 0;
    let reels = 0;
    let usage: InstagramUsage | null = null;
    let hasMore = true;
    const budget = this.syncBatchReels();

    try {
      const token = await this.connections.getFreshAccessToken(connection);

      while (pages < this.maxPages() && reels < budget) {
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
          pagesFetched: pages,
          reelCount,
          // Freshness, not completeness: a batch that finished did refresh what
          // it walked, and `hasMore` already carries whether more remains.
          // Stamping this only on a complete walk left every account bigger
          // than one batch permanently "stale", which is what made the gallery
          // re-sync on every open.
          lastSyncedAt: new Date(),
          // Only an extend moves the frontier. A refresh must leave it alone,
          // or a creator who had paged out to reel 500 would come back after
          // the TTL to find Load more re-fetching reel 101 — four clicks that
          // surface nothing new before it advanced again.
          ...(mode === 'extend' ? { nextCursor: cursor, hasMore } : {}),
          lastError: null,
        },
      });

      this.logger.log(
        `ig-media: ${mode} ${connectionId} — ${reels} reel(s) this batch, ${reelCount} cached, ${pages} page(s), more=${hasMore}, ${Date.now() - startedAt}ms`,
      );

      await this.realtime.emitReelSyncUpdated({
        creatorProfileId: connection.creatorProfileId,
        status: 'ready',
        reelCount,
        // A refresh leaves the frontier alone, so report what the state still
        // says rather than this batch's local view of it.
        hasMore: mode === 'extend' ? hasMore : (state?.hasMore ?? true),
      });
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
      // Failures matter more than successes here — without this the spinner
      // stays up until the client's slow backstop notices.
      await this.realtime.emitReelSyncUpdated({
        creatorProfileId: connection.creatorProfileId,
        status: 'error',
        error: message,
      });
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

  /**
   * Syncs left claiming to be in flight.
   *
   * Nothing else recovers these. `status` is set to SYNCING before the walk and
   * only moved by the walk finishing or failing, so a process that dies mid-walk
   * — or a job Redis loses — leaves it SYNCING for good. Since the picker now
   * waits on a socket event rather than polling, that is a spinner that never
   * stops rather than a stale timestamp.
   *
   * Moves them to ERROR rather than re-enqueuing: the walk is resumable from its
   * stored cursor, and a creator pressing Refresh is a better outcome than
   * silently re-spending a Graph budget on a sync that already failed once for
   * a reason we cannot see from here.
   */
  async resetStuckSyncs(): Promise<number> {
    const staleBefore = new Date(Date.now() - this.stuckSyncMs());
    // Read first, so the creators can be told. updateMany reports a count and
    // nothing else, and a state reset nobody hears about still leaves the
    // picker waiting on an event that is never coming.
    const stuck = await this.prisma.instagramMediaSyncState.findMany({
      where: {
        status: { in: [IgMediaSyncStatus.SYNCING, IgMediaSyncStatus.QUEUED] },
        updatedAt: { lte: staleBefore },
      },
      select: {
        connectionId: true,
        connection: { select: { creatorProfileId: true } },
      },
      take: 50,
    });
    if (stuck.length === 0) return 0;

    await this.prisma.instagramMediaSyncState.updateMany({
      where: { connectionId: { in: stuck.map((row) => row.connectionId) } },
      data: {
        status: IgMediaSyncStatus.ERROR,
        lastError:
          'The sync stopped without finishing. Press Refresh to try again.',
      },
    });

    for (const row of stuck) {
      // Never throws — it logs and moves on, so one bad notification cannot
      // stop the rest of the sweep.
      await this.realtime.emitReelSyncUpdated({
        creatorProfileId: row.connection.creatorProfileId,
        status: 'error',
        error: 'The sync stopped without finishing.',
      });
    }

    this.logger.warn(
      `ig-media: reset ${stuck.length} stuck sync(s) that never finished`,
    );
    return stuck.length;
  }

  /** How long a SYNCING/QUEUED state must sit before it counts as abandoned. */
  private stuckSyncMs(): number {
    return Math.max(
      60_000,
      Number(this.config.get('IG_MEDIA_STUCK_SYNC_MS', 900_000)),
    );
  }

  /** Connections whose cache is stale enough for the nightly refresh. */
  async listConnectionIdsWithStaleCache(
    olderThanDays: number,
  ): Promise<string[]> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.instagramMediaSyncState.findMany({
      where: {
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lte: cutoff } }],
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
