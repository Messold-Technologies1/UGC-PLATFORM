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
};

export type InstagramMediaPageApi = {
  status: InstagramMediaStatus;
  username: string | null;
  lastFullSyncAt: string | null;
  stale: boolean;
  items: InstagramReelApi[];
  /** Opaque keyset cursor — pass straight back, never construct one. */
  nextCursor: string | null;
  reelCount: number;
  error: string | null;
};

export type InstagramMediaSyncStatusApi = {
  status: "idle" | "queued" | "syncing" | "ready" | "error" | "not_connected";
  reelCount: number;
  lastFullSyncAt: string | null;
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
