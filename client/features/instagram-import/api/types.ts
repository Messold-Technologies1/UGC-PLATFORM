export type InstagramMediaStatus =
  | "ready"
  | "syncing"
  | "error"
  | "not_connected"
  | "reconnect_required";

export type InstagramReelApi = {
  igMediaId: string;
  permalink: string | null;
  /** Signed CDN URL — short-lived, display only, never persisted. */
  thumbnailUrl: string | null;
  caption: string | null;
  postedAt: string | null;
  durationSeconds: number | null;
  likeCount: number | null;
  viewCount: number | null;
  alreadyImported: boolean;
  portfolioVideoId: string | null;
  /**
   * False when Instagram returned no downloadable file for this reel, so it can
   * never be imported. Meta withholds `media_url` for media containing
   * copyrighted material — licensed audio on a reel being the usual cause —
   * while still returning the thumbnail, so these look normal until you try.
   */
  importable: boolean;
};

export type InstagramMediaPageApi = {
  status: InstagramMediaStatus;
  username: string | null;
  /**
   * When a sync batch last completed. Not "last full walk" — a batch that
   * stopped at its reel budget still refreshed the top of the account.
   */
  lastSyncedAt: string | null;
  stale: boolean;
  items: InstagramReelApi[];
  /** Opaque keyset cursor — pass straight back, never construct one. */
  nextCursor: string | null;
  /**
   * True when Instagram has reels past the end of our cache. Reaching the cache
   * tail with this set is what offers "Load more"; scrolling within the cache
   * is free, only that button spends a Graph call.
   */
  hasMoreOnInstagram: boolean;
  reelCount: number;
  /**
   * How many cached reels cannot be imported, across the whole cache. First page
   * only; null on later pages.
   */
  unavailableCount: number | null;
  error: string | null;
};

export type InstagramMediaSyncStatusApi = {
  status: "idle" | "queued" | "syncing" | "ready" | "error" | "not_connected";
  reelCount: number;
  lastSyncedAt: string | null;
  hasMore: boolean;
  error: string | null;
};

export type ImportInstagramReelsResponse = {
  imported: Array<{
    id: string;
    igMediaId: string;
    assetState: "READY" | "PROCESSING" | "FAILED" | "LINK_ONLY";
  }>;
  skipped: Array<{
    igMediaId: string;
    reason: "already_imported" | "not_found" | "not_a_reel" | "no_media_url";
  }>;
};
