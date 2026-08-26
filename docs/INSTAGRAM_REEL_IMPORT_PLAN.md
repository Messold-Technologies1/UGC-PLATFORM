# Instagram Reel Import — Implementation Plan

Let creators build their portfolio by picking reels straight from their connected
Instagram account, instead of re-uploading files they already published.

Status: plan / not yet implemented.

---

## 1. What already exists (nothing here is greenfield)

| Piece | Location | Notes |
|---|---|---|
| Instagram OAuth (Instagram Login, no FB Page) | `server/src/social-connections/instagram.client.ts` | Long-lived token exchange + refresh already implemented |
| Token storage, encrypted | `SocialConnection` model, `social-crypto.util.ts` | AES-256-GCM, `SOCIAL_TOKEN_ENC_KEY` |
| Scopes granted today | `instagram.client.ts` `SCOPES` | `instagram_business_basic`, `instagram_business_manage_insights` |
| Token auto-refresh cron | `social-metrics.cron.ts` `refreshTokens()` | Daily 03:00 UTC, refreshes near-expiry tokens |
| BullMQ queue + worker + watchdog pattern | `social-metrics-queue.service.ts`, `jobs/watermark-queue.service.ts` | Inline fallback when `REDIS_URL` is absent |
| Portfolio CRUD, S3 presign, multipart upload | `server/src/creator-portfolio/*`, `client/features/creator-portfolio/*` | `videoKey` is required and ownership-checked |
| Portfolio grid + "Add reel" tile | `creator-profile-update/portfolio-components.tsx` → `PortfolioGrid` | `onAdd` currently opens the upload drawer directly |
| Wizard wiring | `creator-profile-wizard.tsx:1456` `onAdd={() => openPortfolioDrawer(null)}` | This is the single call site to intercept |
| ffmpeg | `watermark/watermark.service.ts` | Available for thumbnail/transcode work |
| Rate limiting | `ThrottlerModule` global 100/60s, `@Throttle` per route | Already the house pattern |

**`instagram_business_basic` already covers `GET /me/media`.** No new scope, no new
App Review submission, no re-consent for already-connected creators.

---

## 2. The one decision that shapes everything

`GET /me/media` returns `media_url` and `thumbnail_url` as **short-lived,
signed CDN URLs**. Meta documents them as temporary; in practice they expire in
hours to days. They are not stable identifiers.

So "just save the Instagram link in our DB and play from there" breaks silently
some days after import — for the creator and, worse, on the public
brand-facing profile. The only durable IG identifiers are `id` (media id) and
`permalink` (the `instagram.com/reel/...` page, which is an embed/redirect, not
a playable video file).

### Two modes, one plan

| | **Mirror mode (recommended)** | **Link mode** |
|---|---|---|
| What we store | Video + thumbnail copied into our S3, plus IG provenance (`igMediaId`, `permalink`) | Only IG media id + permalink; `media_url` re-resolved on read |
| Playback after 7 days | Works | Requires a live Graph call + a valid token |
| If creator disconnects IG or revokes the token | Portfolio unaffected | Portfolio videos go dark |
| Public brand-facing profile | Served from CDN like every other video | Every viewer triggers Graph calls → rate-limit exposure on read |
| Works with the existing `videoKey` ownership checks | Yes | No |
| Cost | One-time egress + storage per reel (~10–100 MB) | Ongoing Graph calls forever |

**Recommendation: mirror mode.** The load-bearing reason is expiry alone: link
mode means portfolios that go dark within days and a Graph call on every brand
page view.

It is also what the portfolio module already assumes.
`assertVideoKeyOwner()` (`creator-portfolio.service.ts:111`) throws unless the
key starts with `creator-portfolio/{creatorId}/videos/`, and every `createVideo`
runs `dto.videoKey` through it. That is an authorization check — it stops
creator A claiming a key under creator B's prefix — so it structurally requires
the video to be an object in our own bucket. Add that `videoKey`/`videoUrl` are
non-null required columns and that no code path anywhere plays a portfolio video
from a foreign URL, and link mode is the one that fights the existing design.

The schema and API below support **both**; the mode is a single env flag
(`PORTFOLIO_IG_IMPORT_MODE=mirror|link`, default `mirror`). Link mode just skips
the mirror job and marks the row `LINK_ONLY`. If you want link-only for launch
speed, ship it behind that flag and flip to mirror later — the same
`igMediaId` on the row lets a backfill job mirror rows retroactively.

The rest of this plan assumes mirror mode where the two differ, and flags the
difference where it matters.

---

## 3. UX flow

### 3.1 "Add reel" becomes a chooser

Today `PortfolioGrid`'s **Add reel** tile calls `onAdd()`, which opens the
upload drawer. It will instead open a small **source chooser** sheet:

```
┌──────────────────────────────────────────┐
│  Add a reel                              │
│                                          │
│  ⬆  Upload from your device              │
│     MP4 or MOV, up to 1 GB               │
│                                          │
│  ◎  Choose from Instagram                │
│     Pick reels you've already posted     │
│     [Connect Instagram]  ← if unlinked   │
└──────────────────────────────────────────┘
```

- **Upload from your device** → the existing flow, unchanged.
- **Choose from Instagram** → the reel gallery below.
- If the creator has no ACTIVE Instagram connection, the second option shows
  **Connect Instagram** and routes to the existing
  `GET /api/social/instagram/connect-url` flow, returning to the portfolio step
  afterwards (add a `returnTo` param to the callback redirect so we come back
  here, not to `/creator/settings/profile`).
- If the connection is in `ERROR` (token revoked), show **Reconnect Instagram**
  with a one-line reason.

Skipping the chooser: if IG is already connected and the creator has imported
before, remember their last choice in `localStorage` and preselect that tab —
but always show both.

### 3.2 The reel gallery

A full-height drawer/sheet (reuse `vaul`, already a dependency):

- **Header**: `@username · 47 reels` · **Refresh** button · **Last updated 2 days ago**.
- **Grid**: 9:16 thumbnail tiles, 3 across on mobile / 5 on desktop, virtualized
  with `react-virtuoso` (already a dependency) + TanStack Query
  `useInfiniteQuery`.
- **Infinite scroll**: pages of 24, keyset-paginated out of *our* cache, not
  out of Graph. Scrolling never blocks on Instagram.
- **Multi-select**: tap to toggle, a numbered badge shows selection order,
  sticky footer shows `4 selected · Add to portfolio`. Cap a single batch at
  **20**.
- **Already-imported reels** render dimmed with an "Added" chip and are not
  selectable (we know this from `importedVideoId` on the cache row).
- **Per tile**: duration, view/like count if available, posted date. Tapping the
  ⓘ opens the reel's `permalink` in a new tab.
- **Empty / syncing states**:
  - First ever open → skeleton grid + "Fetching your reels from Instagram…"
    while the sync job runs; poll `GET .../media` every 2s (or push over the
    existing socket.io gateway).
  - Zero reels → "We couldn't find any reels on @handle. Only reels you posted
    from this account show up here — collabs and cross-posts may be missing."
  - Sync failed → the error plus **Try again**.

### 3.3 After selecting

Import immediately. There is no metadata step — see §3.4. The selected reels
become portfolio videos and appear in the grid at once.

Mirror mode note: imported rows appear immediately with the IG thumbnail and a
`PROCESSING` state, and flip to playable when the mirror job finishes (seconds
to a couple of minutes). The existing `Progress` component covers this. The
creator can leave the page.

### 3.4 Portfolio videos carry no metadata

**Decision: a portfolio video is a video.** No industry label, no description,
no tags, no language — and no creator-facing visibility toggle. This applies to
device uploads and Instagram imports alike, and it is the single biggest
simplification in this plan.

#### Dropped from the database

- Table `CreatorPortfolioVideoTag` — gone entirely.
- Tables `PortfolioIndustrySuggestion`, `PortfolioTagSuggestion`,
  `PortfolioLanguageSuggestion` — the suggestion catalogues have no remaining
  consumer.
- Columns `CreatorPortfolioVideo.industryLabel`, `.language`, `.description`.
- Index `@@index([visibilityStatus, industryLabel])` (replaced by a plain
  `[creatorId, createdAt]` — which already exists).

#### `visibilityStatus` stays as a column, loses its control

The Public/Private toggle disappears from the UI and every video is created
`PUBLIC`. The column and the `PortfolioVisibilityStatus` enum **stay**, so all
of this keeps working untouched:

- the go-live gate that counts public videos
  (`creator-listing-state.util.ts:85`, `MIN_PORTFOLIO_VIDEOS = 3`);
- the three public-profile query filters in `creator-profile.service.ts`;
- the browse-creators filter (`creator-list-filters.util.ts:251`);
- `wishlists.service.ts:30`.

> **Consequence to accept.** Nothing writes `visibilityStatus` after creation
> once `updateVideo` is gone (see below), and no admin surface sets it today —
> `ReviewDrawer.tsx:300` only *reads* it to count public videos. So the column
> becomes effectively constant `PUBLIC`, and the only way to take a video down
> is to delete it. Keeping the column costs nothing and leaves the door open if
> moderation-hiding is ever wanted; it just isn't reachable today.

#### The update endpoint dies with the fields

`UpdatePortfolioVideoDto` contains *only* the five fields being removed —
`industryLabel`, `tags`, `language`, `description`, `visibilityStatus`. Nothing
else. With them gone the DTO is empty, so the whole edit path goes:

- `PATCH /api/creator-portfolio/videos/:id` and `updateVideo()` in the service;
- `update-portfolio-video.dto.ts`;
- client `api/update-portfolio-video.ts` and
  `hooks/use-update-portfolio-video-mutation.ts`;
- `PortfolioEditDrawer` entirely, and the `onEdit` prop threaded into
  `PortfolioGrid` from both call sites.

A portfolio tile ends up with one action: **delete**. (Last revision of this
plan said the drawer would collapse to "visibility + thumbnail + delete" — wrong
on both counts: there is no thumbnail field in the update DTO, and visibility is
now going too. It collapses to nothing.)

#### Dropped from the server

- The three suggestion routes: `GET suggestions/industries`, `.../tags`,
  `.../languages` (`creator-portfolio.controller.ts:190-207`).
- The suggestion upserts in `createVideo`, and the `normalizeSuggestion` /
  `toTitleCaseLabel` helpers that exist only for them.
- `visibilityStatus` off `CreatePortfolioVideoDto` (currently a *required*
  `@IsIn(['public','private'])`); the service always writes `PUBLIC`.
- Fields across `portfolio-video-response.dto.ts`,
  `portfolio-section-response.dto.ts`, `admin-creator-list.dto.ts`,
  `creator-public-list-item.dto.ts`, `creator-profile-response.dto.ts`.
- Prisma selects in `creator-profile.service.ts` (three query shapes plus two
  mapping sites), `wishlists.service.ts`, `creator-list-filters.util.ts`.

#### Dropped from the client

- `creator-portfolio-tags-modal.tsx` — delete (289 lines).
- `hooks/use-portfolio-suggestion-queries.ts` and
  `api/portfolio-suggestion-lists.ts` — delete.
- `creator-portfolio-upload-form.tsx` — the four metadata fields and the
  visibility control, and with them the `ReactSelect`, `ISO6391` and
  `SuggestionChips` imports.
- `portfolio-components.tsx` — `PortfolioEditDrawer`, the `pe-pf-ind` industry
  chip, and the public/private indicator at line 111.
- Display sites that read these fields: `portfolio-card.tsx`,
  `public-creator-profile.tsx:1236`, `profile-drawer.tsx:815`,
  `map-profile-to-creator.ts:137`, `creator-account-profile-view.tsx:93`.

#### Two copy fixes this forces

- `portfolio-step.tsx:175` reads "Upload at least 3 **approved** videos to go
  live. {publicCount} of 10 uploaded so far." With everything public on
  creation, `publicCount` is just the video count, and "approved" now promises a
  gate that no longer exists on this field. Reword to plain counting.
- `list-creators-query.dto.ts:90` promises free-text search matches on
  "portfolio-video industry & tags". It won't. See below.

#### Losing `description` costs two small things

It was the video's alt text and the fallback card title in
`portfolio-card.tsx:185`, which now falls through to the literal "Portfolio
Item". It was also where an imported reel's Instagram caption would have landed;
now the caption is read for the gallery tile and then discarded. Both are
acceptable — noting them so neither is a surprise in review.

#### One behaviour change to accept

`buildCreatorListSearchWhere()` (`creator-list-filters.util.ts:290-300`) has two
OR clauses that match a brand's free-text search against portfolio
`industryLabel` and tags. Those go away, so free-text search no longer matches
on them.

What still matches: city, state, country, bio, **niche and category facet
labels** (including custom "Other" text), package names, and open-to
restrictions. Niche and category are the strong signal for a keyword search, and
they come from `facetSelections`, not from portfolio videos — so this narrows
search rather than breaking it.

The brand-facing **filter bar** is unaffected: it reads creator category and
restriction suggestions, which are separate catalogues.

Sections (`CreatorPortfolioSection`) stay, and become the only way a creator
organises a portfolio — arguably clearer than freeform tags ever were.

### 3.5 Watermarking was never on this path

The watermark service is the **order delivery** pipeline.
`WatermarkQueueService` is keyed by `deliveryId` and is driven from
`orders.service.ts` and `order-delivery-asset.dto.ts`;
`grep -rn watermark server/src/creator-portfolio` returns nothing.

So there is nothing to remove for portfolio — and the delivery watermark must
**stay**, since it is what protects a paid deliverable before the brand
approves it. This plan does not touch it.

The mirror job writes straight to S3 under the existing portfolio key prefix and
never enters the watermark queue.

One thing to keep separate: the portfolio confirmation checklist ("no watermark,
logo or platform branding") is a *content review rule* about what is burned into
the creator's own video. Admin review enforces it; the watermark service has
nothing to do with it. Imported reels are still subject to it.

---

## 4. Data model

Three additions. All in one migration.

### 4.1 New: `InstagramMediaItem` — the 7-day cache

```prisma
model InstagramMediaItem {
  id           String   @id @default(uuid()) @db.Uuid
  connectionId String   @db.Uuid
  /// Instagram's stable media id — the only durable IG identifier.
  igMediaId    String
  mediaType        String   // VIDEO | IMAGE | CAROUSEL_ALBUM
  mediaProductType String?  // REELS | FEED | AD
  permalink        String?
  caption          String?
  /// Short-lived signed CDN URLs. Never treated as durable.
  mediaUrl         String?
  thumbnailUrl     String?
  /// When the two URLs above stop working (conservative estimate).
  urlsExpireAt     DateTime?
  postedAt         DateTime?
  durationSeconds  Int?
  likeCount        Int?
  commentsCount    Int?
  viewCount        Int?
  /// Set once this reel has been imported into the portfolio.
  importedVideoId  String?  @db.Uuid
  fetchedAt        DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  connection SocialConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)

  @@unique([connectionId, igMediaId])
  /// Drives the gallery's keyset pagination.
  @@index([connectionId, mediaProductType, postedAt(sort: Desc), igMediaId])
  @@index([importedVideoId])
}
```

### 4.2 New: `InstagramMediaSyncState` — one row per connection

```prisma
model InstagramMediaSyncState {
  connectionId   String   @id @db.Uuid
  status         IgMediaSyncStatus @default(IDLE) // IDLE | QUEUED | SYNCING | READY | ERROR
  /// Graph `paging.cursors.after` for resuming a partial walk.
  nextCursor     String?
  hasMore        Boolean  @default(true)
  pagesFetched   Int      @default(0)
  reelCount      Int      @default(0)
  /// Cache freshness clock — the 7-day TTL is measured from here.
  lastFullSyncAt DateTime?
  /// Rate-limits the manual Refresh button server-side.
  lastRefreshAt  DateTime?
  lastError      String?
  updatedAt      DateTime @updatedAt

  connection SocialConnection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
}
```

### 4.3 Changed: `CreatorPortfolioVideo` — provenance + processing state

Alongside the metadata columns dropped in §3.4:

```prisma
enum PortfolioVideoSource { UPLOAD  INSTAGRAM }
enum PortfolioVideoAssetState { READY  PROCESSING  FAILED  LINK_ONLY }

model CreatorPortfolioVideo {
  // ...existing fields...
  source        PortfolioVideoSource     @default(UPLOAD)
  assetState    PortfolioVideoAssetState @default(READY)
  /// IG media id when source = INSTAGRAM. Unique per creator so a reel
  /// can't be imported twice.
  igMediaId     String?
  igPermalink   String?
  igPostedAt    DateTime?
  importedAt    DateTime?

  @@unique([creatorId, igMediaId])
}
```

**`videoKey`/`videoUrl` must become nullable** so an INSTAGRAM row can exist
before its mirror finishes (and permanently, in link mode). Every read path
must tolerate that — `assertVideoKeyOwner` is skipped for IG rows, and the
public profile query filters to `assetState IN (READY, LINK_ONLY)`.

**Backfill:** all existing rows get `source=UPLOAD`, `assetState=READY`. Safe,
non-breaking, one `UPDATE`.

---

## 5. API surface

All under the existing `social` and `creator-portfolio` controllers.

| Method | Path | Purpose | Throttle |
|---|---|---|---|
| `GET` | `/api/social/instagram/media` | Cache-first, keyset-paginated reels. `?cursor=&limit=24` | 60/min |
| `POST` | `/api/social/instagram/media/refresh` | Force a re-sync (the Refresh button) | **3/hour** + server-side `lastRefreshAt` guard |
| `GET` | `/api/social/instagram/media/status` | `{ status, reelCount, lastFullSyncAt, hasMore }` for the polling UI | 120/min |
| `POST` | `/api/creator-portfolio/videos/import-instagram` | `{ igMediaIds: string[] }` → creates portfolio rows, enqueues mirrors | **10/min** |

### `GET /api/social/instagram/media` response

```jsonc
{
  "status": "ready",           // ready | syncing | error | not_connected | reconnect_required
  "username": "creator.handle",
  "lastFullSyncAt": "2026-08-24T11:02:00Z",
  "stale": false,              // true once older than 7 days
  "items": [
    {
      "igMediaId": "17912...",
      "permalink": "https://www.instagram.com/reel/Cxyz/",
      "thumbnailUrl": "https://scontent...",   // may be re-signed on read
      "caption": "GRWM with the new serum",
      "postedAt": "2026-07-02T04:11:00Z",
      "durationSeconds": 34,
      "likeCount": 812,
      "viewCount": 41203,
      "alreadyImported": false,
      "portfolioVideoId": null
    }
  ],
  "nextCursor": "eyJwb3N0ZWRBdCI6..."   // OUR keyset cursor, not Graph's
}
```

Rules:
- Cache empty **or** `lastFullSyncAt` older than 7 days → respond
  `status: "syncing"` with whatever items we do have, and enqueue a sync. Never
  call Graph on the request path.
- The gallery's `nextCursor` is **our** `(postedAt, igMediaId)` keyset cursor
  over the cache table. Graph's `after` cursor stays server-side in
  `InstagramMediaSyncState`. Confusing the two is the classic bug here.
- Thumbnails whose `urlsExpireAt` has passed are served through a redirect
  endpoint (§7.4) rather than returned dead.

### `POST /api/creator-portfolio/videos/import-instagram`

```jsonc
// request — §3.4 removed every metadata field and the visibility toggle
{ "igMediaIds": ["17912...", "17913..."] }

// response
{
  "imported": [{ "id": "uuid", "igMediaId": "17912...", "assetState": "PROCESSING" }],
  "skipped":  [{ "igMediaId": "17913...", "reason": "already_imported" }]
}
```

Server-side validation, all of it mandatory:
- The `igMediaId` must exist in `InstagramMediaItem` **for a connection owned by
  this creator**. This is the authorization check — it stops a creator importing
  someone else's reel by guessing an id.
- `mediaProductType === 'REELS'` (defence in depth; the gallery already filters).
- Batch size ≤ 20.
- Dedupe against `@@unique([creatorId, igMediaId])` → `skipped`.
- After the transaction, call `recomputeCreatorListingState()` — same as
  `createVideo` does — so importing 3 reels can flip the profile to
  go-live-eligible.

---

## 6. The fetch pipeline

### 6.1 Graph call

```
GET https://graph.instagram.com/{version}/me/media
  ?fields=id,media_type,media_product_type,media_url,thumbnail_url,
          permalink,caption,timestamp,like_count,comments_count
  &limit=25
  &after={cursor}
  &access_token={token}
```

- Add `fetchMediaPage(accessToken, cursor?)` to the existing `InstagramClient`,
  reusing its `timedFetch` (15s abort) and `InstagramApiError` (code 190 →
  auth error → mark connection `ERROR`).
- Reuse `ensureFreshInstagramToken()` — token refresh is already solved.
- **Reels filter is client-side:** `/me/media` has no server-side type filter,
  so we fetch pages and keep only
  `media_type === 'VIDEO' && media_product_type === 'REELS'`. Images and
  carousels are discarded and never stored (per the requirement: videos only).
- **Page budget:** stop at `IG_MEDIA_MAX_PAGES` (default 12 → 300 media items).
  A creator with 800 posts doesn't get an unbounded walk; `nextCursor` and
  `hasMore` persist so a later "load more" resumes instead of restarting.
- A stale/invalid `after` cursor → clear it and restart the walk from page 1
  (an upsert on `(connectionId, igMediaId)` makes a restart idempotent).

### 6.2 The queue

New `InstagramMediaQueueService`, modelled directly on
`SocialMetricsQueueService` (same watchdog, same inline fallback when
`REDIS_URL` is unset, same fixed-`jobId` dedupe).

- Queue: `instagram-media-sync`, job `sync-media`, `jobId = igmedia-{connectionId}`.
- `attempts: 3`, exponential backoff base 30s.
- Job priorities: `1` interactive (creator is staring at the gallery),
  `5` prewarm (fired from the OAuth callback), `10` cron refresh. BullMQ serves
  low numbers first, so a creator waiting always jumps the nightly backlog.
- Each job: resolve token → walk pages → upsert reels → update sync state →
  optionally emit a socket event so the open gallery re-fetches.

### 6.3 Mirror job (mirror mode only)

Separate queue `instagram-media-mirror`, one job per imported video, so a slow
download never blocks the metadata sync.

**The browser is never involved.** The existing upload path is browser-driven —
the API only signs a URL and the bytes go straight from the device to S3. The
mirror is the opposite shape: our server pulls from Instagram's CDN and pushes to
S3, and the creator's device has no part in it.

```
  upload   browser ──presign──> API ;  browser ──PUT bytes──> S3
  mirror   worker ──GET media_url──> IG CDN ;  worker ──stream──> S3
```

The import request only creates the row and enqueues. That is why the UI can
show tiles instantly with the Instagram thumbnail while the video is still
copying.

#### The copy

```ts
// 1. Re-sign if the cached URL has gone stale — it was read at sync time,
//    possibly days ago.
if (item.urlsExpireAt && item.urlsExpireAt < new Date()) {
  await this.media.resyncSinglePage(item.connectionId, item.igMediaId);
  item = await this.reload(item.id);
}

// 2. Fetch from the IG CDN, host pinned.
const res = await fetch(assertMetaCdnHost(item.mediaUrl), {
  signal: AbortSignal.timeout(this.mirrorTimeoutMs()),   // ~120s, not 15s
  redirect: 'manual',
});

// 3. Guard before spending bandwidth.
const len = Number(res.headers.get('content-length'));
if (len > PORTFOLIO_VIDEO_MAX_BYTES) throw new MirrorTooLargeError(len);
const contentType = res.headers.get('content-type');   // expect video/mp4

// 4. Stream into S3 multipart — constant memory, not file-sized.
await new Upload({
  client: this.storage.rawClient(),
  params: {
    Bucket: this.storage.bucketName(),
    Key: row.videoKey,          // generated at import time — see below
    Body: res.body,
    ContentType: contentType,
  },
  queueSize: 4,
  partSize: 10 * 1024 * 1024,
}).done();
```

The thumbnail gets different treatment: a ~50 KB JPEG, so it goes through the
existing `putObjectBuffer` helper. No reason to stream that. If Instagram
returns no thumbnail, extract frame 1 with the existing ffmpeg helper.

One transaction then sets `videoUrl` (via `buildCdnUrl`), `thumbnailKey` and
`assetState=READY`. Nothing flips to `READY` until both objects are actually in
the bucket. Terminal failure after 3 attempts sets `assetState=FAILED` with a
retry button in the UI.

#### Details that decide whether this works

- **No new storage kind.** `buildObjectKey({ kind: 'creator_portfolio_video',
  creatorProfileId, contentType })` already returns
  `creator-portfolio/{creatorId}/videos/{uuid}.mp4` — exactly the prefix
  `assertVideoKeyOwner` checks. Reuse it as-is.
- **Generate the key at import time, not in the worker.** `buildObjectKey`
  calls `randomUUID()`. A worker that generated its own key would, on a retry
  after a half-finished upload, write to a *new* key and orphan the partial
  object in the bucket forever. Generate once when the row is created, store it
  in `videoKey`, and let retries overwrite the same key.
- **Pin the CDN host.** `media_url` is a URL we fetch from inside our network.
  It comes from Meta's API so the risk is low, but the discipline is cheap:
  require https, allowlist `*.cdninstagram.com` and `*.fbcdn.net`, and use
  `redirect: 'manual'` so a redirect cannot walk us to an internal address.
  This is the one genuine security consideration in the feature.
- **Trust the response content-type, not the URL.** Run the CDN's declared type
  through the existing `validateContentType('creator_portfolio_video', ct)`.
- **Cap twice.** Check `content-length` before streaming, and abort mid-stream
  if the actual byte count exceeds 1 GiB anyway, in case the header lies.
- **Mirror promptly.** The window between reading `media_url` and using it is
  the risk; enqueue inside the same request that creates the row. On a 403 from
  the CDN, re-sync that page and retry once.

#### Streaming vs buffering

Streaming needs one new dependency, `@aws-sdk/lib-storage`. Buffering needs
none — `getObjectBuffer`/`putObjectBuffer` already exist, and the watermark
service already uses exactly that shape on order deliveries that can reach
1 GiB, so the pattern is proven in this codebase.

A typical 1080p reel is 20–40 MB, so at `IG_MIRROR_CONCURRENCY=2` buffering
would peak around 100 MB and would very likely be fine. Streaming is still the
better call — memory stays flat regardless of reel length or concurrency — but
it is a *strictly better and cheap* choice, not a case of the alternative
crashing. An earlier draft of this plan claimed buffering "will OOM the API
pod"; that was overstated.

### 6.4 Cron

Extend `SocialMetricsCron` rather than adding a new one:

```
@Cron('0 20 * * *')   // 20:00 UTC, offset from the existing 18:30 metrics run
async refreshStaleMediaCaches()
```

Enqueue at priority 10 the connections whose `lastFullSyncAt` is older than
6 days **and** whose creator has opened the gallery in the last 30 days. Don't
refresh caches nobody looks at — that is free rate-limit budget spent on
nothing.

---

## 7. Rate limiting: the 100-simultaneous-creators question

### 7.1 What Meta actually enforces

Instagram Platform applies **Business Use Case (BUC) rate limiting** on
`graph.instagram.com`, on top of an app-level platform limit. Every response
carries usage telemetry:

- `X-Business-Use-Case-Usage` — per-account JSON with `call_count`,
  `total_cputime`, `total_time` (each a **percentage of the allowance**) and
  `estimated_time_to_regain_access` in minutes when throttled.
- `x-app-usage` — the same three percentages at app level.
- Throttled requests return HTTP 429 with error code **4** (app-level) or
  **17** (user-level); code **32** for page-level.

⚠️ **Verify the current numeric formula against Meta's live docs before
launch** — Meta has changed it more than once, and it differs between
"Instagram API with Instagram Login" and the older Facebook-Login variant. The
design below deliberately does not depend on the exact number: we read the
percentage headers and back off from them, which stays correct if Meta changes
the formula.

### 7.2 The budget math

For 100 creators all clicking "Choose from Instagram" in the same minute:

| | Calls |
|---|---|
| Page walk per creator, typical (≈150 posts, 25/page) | 6 |
| Token refresh, only if near expiry (rare) | ~0 |
| **Per creator** | **~6** |
| **100 creators, cold cache** | **~600** |
| 100 creators, warm cache (the normal case) | **0** |
| Nightly cron over 1,000 connections, staggered | ~6,000/day |

600 calls is a small burst, not a volume problem. The risk is **burst rate**,
not daily total — and it's spread over accounts, since BUC limits are largely
per-account and each account only spends ~6 calls.

At a global limiter of **5 requests/second**, 600 calls drain in ~2 minutes.
Every creator sees a spinner for at most that long, and only on their first
ever open.

### 7.3 Seven layers of defence

Ordered from the request path outward:

1. **Nothing hits Graph on the request path.** `GET .../media` reads Postgres
   only. A hundred creators browsing is a hundred indexed queries.
2. **7-day cache.** After the first sync a creator can open the gallery fifty
   times for zero Graph calls. This alone removes ~99% of the load.
3. **Per-connection dedupe.** `jobId = igmedia-{connectionId}` means a creator
   mashing the button, or three browser tabs, produce **one** job. (Reuse the
   completed/failed-leftover sweep already in
   `SocialMetricsQueueService.enqueue` — without it a retained finished job
   silently blocks all future syncs for that connection.)
4. **Global token bucket.** BullMQ's built-in limiter, app-wide:
   ```ts
   new Worker(QUEUE, handler, {
     connection,
     concurrency: Number(env.IG_MEDIA_CONCURRENCY ?? 3),
     limiter: { max: Number(env.IG_MEDIA_RATE_MAX ?? 5), duration: 1000 },
   })
   ```
   This is the hard ceiling. 100 creators cannot outrun it regardless of
   arrival pattern. Note the existing `BULLMQ_WORKER_ENABLED` convention: on a
   multi-replica API only one replica runs the worker, which is also what makes
   this limiter genuinely global.
5. **Adaptive backoff from the usage headers.** Parse `x-app-usage` and
   `X-Business-Use-Case-Usage` on every response:
   - any percentage **> 75** → `await worker.rateLimit(60_000)`, i.e. slow the
     whole queue for a minute;
   - any percentage **> 90** → `queue.pause()` for 10 minutes and set a shared
     Redis key `ig:throttle:until` so every replica honours it;
   - HTTP 429 → honour `estimated_time_to_regain_access` exactly (it is in
     minutes), set `ig:throttle:until`, and re-delay the job rather than
     burning an attempt.
6. **Circuit breaker.** 5 consecutive 429s → pause the queue 15 minutes, and
   the gallery shows "Instagram is busy right now — we'll keep trying." Fail
   visibly and calmly rather than hammering.
7. **HTTP throttles on our own endpoints.** `@Throttle` on refresh (3/hour) and
   import (10/min), plus the `lastRefreshAt` DB guard so a refresh survives a
   throttle bypass and returns `429` with a `Retry-After`.

### 7.4 Handling expired cached URLs

The cache holds URLs that die before the 7-day TTL. Two cheap fixes:

- **Thumbnails** are served through
  `GET /api/social/instagram/media/:igMediaId/thumbnail`, which 302s to the
  cached URL when fresh; when `urlsExpireAt` has passed it enqueues a
  single-page re-sync and 302s to a placeholder. Browsers cache the redirect,
  so this costs nothing in steady state.
- **`media_url`** is only ever read by the mirror job, seconds after import.
  It is not stored in `CreatorPortfolioVideo` and is never sent to a brand.

In **link mode** this problem is unavoidable and permanent: every playback needs
a fresh `media_url`, so every brand viewing a creator's profile spends Graph
calls against that creator's budget. That is the strongest argument for mirror
mode.

### 7.5 New env vars

```
PORTFOLIO_IG_IMPORT_MODE=mirror     # mirror | link
IG_MEDIA_SYNC_ENABLED=true
IG_MEDIA_CONCURRENCY=3              # BullMQ worker concurrency
IG_MEDIA_RATE_MAX=5                 # global Graph requests per second
IG_MEDIA_MAX_PAGES=12               # page-walk budget per sync (300 items)
IG_MEDIA_CACHE_TTL_DAYS=7
IG_MEDIA_REFRESH_MIN_INTERVAL_MIN=60
IG_MIRROR_CONCURRENCY=2             # parallel S3 mirrors
```

All optional with defaults, added to `config/env.validation.ts` in the same
style as the existing `INSTAGRAM_*` keys.

---

## 8. Cache and refresh semantics

| Trigger | Behaviour |
|---|---|
| First gallery open | Enqueue at priority 1, show skeleton, poll status |
| Open, cache < 7 days | Serve from cache instantly, no Graph call |
| Open, cache ≥ 7 days | Serve stale cache **immediately** with a "Refreshing…" chip, enqueue in the background. Never make the creator wait on a stale-but-usable cache |
| **Refresh** button | Force sync from page 1, ignore TTL, but honour the 1-hour `lastRefreshAt` guard → toast "Just refreshed a moment ago — try again in 43 minutes" |
| Scroll past the cached tail with `hasMore=true` | Enqueue a continuation sync from `nextCursor`, append when it lands |
| Nightly cron | Refresh caches older than 6 days for recently-active creators only |
| Creator disconnects Instagram | `onDelete: Cascade` drops cache + sync state. Already-imported portfolio videos survive untouched (mirror mode) |
| Token revoked mid-sync | Error code 190 → connection `ERROR`, sync state `ERROR`, gallery shows **Reconnect Instagram** |

Client-side, mirror it: `staleTime: 7 days`, `gcTime: 7 days` on the
`useInfiniteQuery`, keyed by connection id.

---

## 9. Edge cases worth deciding now

| Case | Handling |
|---|---|
| Creator has 0 reels (photos only) | Explicit empty state naming why — reels only, collabs may be missing |
| Reel deleted on Instagram after import | Mirror mode: our copy is unaffected. Link mode: playback breaks — mark `FAILED` on a 404 |
| Same reel imported twice | Blocked by `@@unique([creatorId, igMediaId])`, returned as `skipped` |
| Reel with music/branding overlays | Still subject to the portfolio confirmation rules ("no watermark, logo or platform branding") — a content review rule enforced by admin review, unrelated to the watermark *service* (§3.5). Show the reminder in the import footer; imported reels are **not** auto-approved |
| Reel under the 1080p bar | We can't reliably read resolution from Graph. Mirror mode can probe with ffmpeg and warn; leave enforcement to admin review as today |
| Reel > 1 GiB | Rejected by the existing cap; surface as `FAILED` with the reason |
| Creator's IG account switched to Personal | Graph returns an error → connection `ERROR` → reconnect prompt |
| Two creators claim the same IG account | Already blocked by `@@unique([platform, providerAccountId])` and `InstagramAccountAlreadyLinkedError` |
| No `REDIS_URL` (local dev) | Inline fallback path, exactly like the existing queues |
| Admin acting on a creator's behalf | The `PortfolioActingCreatorDto` pattern extends to import; admins can trigger a sync for a creator via a new admin route |

---

## 10. Delivery phases

Each phase is independently shippable and leaves `main` green.

### Phase 0 — Strip portfolio metadata
Independent of Instagram, and worth landing first: it shrinks the surface every
later phase has to touch.
- Migration: drop `CreatorPortfolioVideoTag`, the three suggestion tables, the
  `industryLabel` / `language` / `description` columns, and the `industryLabel`
  index. `visibilityStatus` stays.
- Delete the `PATCH videos/:id` route, `updateVideo()`, and
  `update-portfolio-video.dto.ts` — the DTO is empty once the five fields go.
- Delete the three suggestion routes, their service methods, and the suggestion
  upserts in `createVideo`. Make `createVideo` always write `PUBLIC`.
- Strip the fields from the remaining DTOs and from the Prisma selects in
  `creator-profile.service.ts`, `wishlists.service.ts` and
  `creator-list-filters.util.ts`.
- Remove the two portfolio OR clauses from `buildCreatorListSearchWhere()`;
  correct the Swagger text at `list-creators-query.dto.ts:90` and the go-live
  copy at `portfolio-step.tsx:175`. Update
  `creator-list-filters.util.spec.ts:155` and
  `creator-portfolio.service.spec.ts` to match.
- Client: delete the tags modal, the edit drawer, the suggestion hook/API module
  and the update mutation; strip the fields and the visibility control from the
  upload form; drop `onEdit` from `PortfolioGrid` and its two call sites; fix the
  six display sites.
- Verify: a brand keyword search still returns sensible results on niche,
  category, city and bio alone, and a freshly uploaded video is `PUBLIC` and
  counts toward go-live.

### Phase 1 — Schema and provenance
- Migration: `InstagramMediaItem`, `InstagramMediaSyncState`, the two new enums,
  new columns on `CreatorPortfolioVideo`, `videoKey`/`videoUrl` nullable.
- Backfill existing rows to `source=UPLOAD`, `assetState=READY`.
- Audit every read of `videoKey`/`videoUrl` for the new nullability:
  `creator-portfolio.service.ts`, `creator-profile.service.ts`
  (listing/completeness), the public profile DTOs, admin list, `wishlists`,
  and the client's `PortfolioVideoApi`.
- New env vars in `config/env.validation.ts`.

### Phase 2 — Graph fetch + queue (backend, no UI)
- `InstagramClient.fetchMediaPage()` + usage-header parsing.
- `InstagramMediaService`: page walk, reels filter, upsert, sync-state
  bookkeeping, keyset pagination for reads.
- `InstagramMediaQueueService` (copy the `SocialMetricsQueueService` shape,
  including the watchdog and leftover-job sweep) with limiter and priorities.
- Endpoints: `GET .../media`, `GET .../media/status`, `POST .../media/refresh`.
- Prewarm hook in the existing OAuth callback next to
  `void this.queue.enqueue(connectionId)`.
- Unit tests: reels filter, page budget, cursor resume, stale-cursor restart,
  429 backoff, TTL logic. Follow the existing `*.service.spec.ts` style.

### Phase 3 — Import + mirror
- `POST /videos/import-instagram` with the ownership check, batch cap, dedupe,
  and `recomputeCreatorListingState()`.
- Add `@aws-sdk/lib-storage`; `InstagramMirrorQueueService` streaming to S3;
  `instagram_import` storage kind.
- Retry endpoint for `FAILED` mirrors.

### Phase 4 — UI
- Source chooser sheet; intercept `onAdd` in `creator-profile-wizard.tsx:1456`
  **and** in `creator-portfolio-manager.tsx` (both call sites).
- `instagram-reel-gallery.tsx`: virtuoso grid, `useInfiniteQuery`, multi-select,
  refresh, all the states from §3.2.
- `PROCESSING` / `FAILED` badges in `PortfolioGrid`.
- `returnTo` support on the IG OAuth callback so connecting mid-wizard returns
  to the portfolio step.

### Phase 5 — Operations
- Extend `SocialMetricsCron` with the stale-cache refresh.
- Structured logs matching the house format
  (`ig-media: synced {connectionId} — {n} reels, {pages} pages, {ms}ms`).
- A queue-debug script alongside `server/scripts/README-queue-debug.md`.
- Load-test the burst: 100 connections enqueued at once, assert the limiter
  holds and no 429s escape the backoff.

---

## 11. Open questions

1. **Mirror or link?** §2 recommends mirror. Needs a call before Phase 1, since
   it decides whether `videoUrl` is ever null in steady state.
2. **Do imported reels need admin approval like uploads?** Assumed yes (same
   `visibilityStatus` + review path). Confirm — auto-approving IG reels would
   be a policy change, not a technical one.
3. **Sort order in the gallery** — newest first (assumed), or best-performing
   first? The latter is available via per-media insights on the scope we already
   hold, at one extra call per page.
4. **Batch cap of 20** — chosen to bound one import's mirror load, not for any
   product reason. Right number?
5. **Is delete-only acceptable for taking a video down?** Follows from dropping
   the visibility control (§3.4). If moderation ever needs to hide rather than
   delete, the column is still there — it just needs an admin-only writer.
