# Debugging the Instagram reel-cache queues

Two queues back the reel import. Both follow the same conventions as
`delivery-watermark` and `social-metrics-sync`, so `README-queue-debug.md`
applies here too — this file only covers what is specific to these.

| Queue | Job id | What it does |
|---|---|---|
| `instagram-media-sync` | `igmedia-<connectionId>` | Walks `/me/media` and caches reels |
| `instagram-media-mirror` | `igmirror-<videoId>` | Streams one imported reel into S3 |

## Is a creator's cache actually syncing?

```sql
SELECT s."status", s."reelCount", s."pagesFetched", s."hasMore",
       s."lastFullSyncAt", s."lastRefreshAt", s."lastError"
FROM "InstagramMediaSyncState" s
JOIN "SocialConnection" c ON c.id = s."connectionId"
WHERE c."username" = '<handle>';
```

- `hasMore = true` with a `nextCursor` is normal: the page-walk budget
  (`IG_MEDIA_MAX_PAGES`) stopped it, and the next sync resumes from there.
- `lastFullSyncAt` is only stamped by a walk that reached the end, so a
  budget-capped cache stays "stale" on purpose and keeps loading its tail.
- `status = ERROR` puts the reason in `lastError`. Error code 190 means the
  token was revoked — the connection is parked in `ERROR` too and the creator
  has to reconnect; no retry will fix it.

## Nothing is importing / everything says PROCESSING

The row exists but its bytes are not in S3 yet. Check the mirror side:

```sql
SELECT id, "assetState", "igMediaId", "videoKey", "importedAt"
FROM "CreatorPortfolioVideo"
WHERE "source" = 'INSTAGRAM' AND "assetState" <> 'READY'
ORDER BY "importedAt" DESC LIMIT 20;
```

`FAILED` rows are retryable from the UI, or via
`POST /api/creator-portfolio/videos/<id>/retry-mirror`. The S3 key is fixed at
import time, so a retry overwrites rather than orphaning a partial object.

Common terminal failures, all logged by `InstagramMirrorService`:

- *Refusing media URL on unexpected host* — the CDN URL was not on a Meta host.
  Not retryable, and worth investigating rather than forcing.
- *Unexpected content type* — the CDN served something that is not mp4/mov/webm.
- *Reel is larger than the … cap* — over 1 GiB.
- *Reel is no longer in the Instagram cache* — the creator disconnected, or the
  reel was deleted on Instagram between selection and mirroring.

## We are being rate limited

The worker reads Meta's `x-app-usage` and `X-Business-Use-Case-Usage` headers
and throttles itself. Look for these lines:

```
ig-media: usage at 82% — slowing the queue
ig-media: usage at 94% — pausing the queue for 10min
ig-media: Meta asked for 7min cool-down
ig-media: 5 consecutive rate limits — breaker open for 15min
```

None of these need intervention; they are the design working. If they are
constant, lower `IG_MEDIA_RATE_MAX` (the hard req/s ceiling) rather than raising
concurrency.

Remember the limiter is only global because a single replica runs the worker —
if `BULLMQ_WORKER_ENABLED` is unset on more than one replica, each gets its own
limiter and the ceiling multiplies.

## Forcing a sync by hand

There is no admin endpoint. Use the creator's own refresh route (rate-limited to
3/hour and guarded by `lastRefreshAt`), or clear the guard first:

```sql
UPDATE "InstagramMediaSyncState"
SET "lastRefreshAt" = NULL, "nextCursor" = NULL, "hasMore" = true
WHERE "connectionId" = '<id>';
```

## Relevant environment variables

| Variable | Default | Notes |
|---|---|---|
| `PORTFOLIO_IG_IMPORT_MODE` | `mirror` | `link` skips the mirror entirely |
| `IG_MEDIA_SYNC_ENABLED` | on | Set `false` to stop all reel syncing |
| `IG_MEDIA_CONCURRENCY` | 3 | Worker concurrency |
| `IG_MEDIA_RATE_MAX` | 5 | Hard Graph requests/second ceiling |
| `IG_MEDIA_MAX_PAGES` | 12 | Page-walk budget (25 media per page) |
| `IG_MEDIA_CACHE_TTL_DAYS` | 7 | When a cache counts as stale |
| `IG_MEDIA_REFRESH_MIN_INTERVAL_MIN` | 60 | Refresh-button guard |
| `IG_MIRROR_CONCURRENCY` | 2 | Parallel S3 mirrors |
| `IG_MIRROR_TIMEOUT_MS` | 120000 | Per-reel download budget |
